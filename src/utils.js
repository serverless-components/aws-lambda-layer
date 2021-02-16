const { readFileSync } = require('fs')
const AWS = require('aws-sdk')
const https = require('https')
const agent = new https.Agent({
  keepAlive: true
})

const sleep = async (wait) => new Promise((resolve) => setTimeout(() => resolve(), wait))

/*
 * Initializes an AWS SDK and returns the relavent service clients
 *
 * @param ${object} credentials - aws credentials object
 * @param ${string} region - aws region
 */
const getClients = (credentials, region = 'us-east-1') => {
  // this error message assumes that the user is running via the CLI though...
  if (Object.keys(credentials).length === 0) {
    const msg = `Credentials not found. Make sure you have a .env file in the cwd. - Docs: https://git.io/JvArp`
    throw new Error(msg)
  }

  AWS.config.update({
    httpOptions: {
      agent
    }
  })

  const lambda = new AWS.Lambda({ credentials, region })

  return {
    lambda
  }
}

/*
 * Publishes a new layer version
 *
 * @param ${instance} instance - the component instance
 * @param ${object} inputs - the component inputs
 * @param ${object} clients - the aws clients object
 */
const deployLayer = async (instance, inputs, clients) => {
  const layerParams = {
    Content: {
      ZipFile: readFileSync(inputs.src)
    },
    LayerName: instance.name,
    CompatibleRuntimes: inputs.runtimes || []
  }

  // eslint-disable-next-line
  console.log(`Publishing Layer "${instance.name}" to the "${inputs.region}" region`)

  const res = await clients.lambda.publishLayerVersion(layerParams).promise()

  var permissionsParams = {
    Action: 'lambda:GetLayerVersion',
    LayerName: instance.name,
    Principal: '*',
    StatementId: Math.random()
      .toString(36)
      .substring(7),
    VersionNumber: res.Version
  }

  await clients.lambda.addLayerVersionPermission(permissionsParams).promise()

  instance.state.arn = res.LayerArn
  instance.state.versionArn = res.LayerVersionArn
  instance.state.version = res.Version
  instance.state.name = instance.name
  instance.state.region = inputs.region

  // eslint-disable-next-line
  console.log(
    `Layer "${instance.name}" version "${instance.state.version}" was successfully published to the "${inputs.region}" region`
  )

  return res.LayerVersionArn
}

/*
 * Removes the specified layer version
 *
 * @param ${instance} instance - the component instance
 * @param ${object} clients - the aws clients object
 * @param ${number} layerVersion - the layer version number to remove
 */
const removeLayerVersion = async (instance, clients, layerVersion) => {
  const deleteLayerVersionParams = {
    LayerName: instance.name,
    VersionNumber: layerVersion
  }

  // eslint-disable-next-line
  console.log(`Removing Layer "${instance.name}" version "${layerVersion}"`)

  await clients.lambda.deleteLayerVersion(deleteLayerVersionParams).promise()
}

/*
 * Removes layer and all its versions from aws
 *
 * @param ${instance} instance - the component instance
 * @param ${object} clients - the aws clients object
 */
const removeLayer = async (instance, clients) => {
  try {
    const listLayerVersionsParams = {
      LayerName: instance.name
    }

    // eslint-disable-next-line
    console.log(`Listing Layer "${instance.name}" versions`)

    const listLayersVersionsRes = await clients.lambda
      .listLayerVersions(listLayerVersionsParams)
      .promise()

    const layerVersions = listLayersVersionsRes.LayerVersions.map(
      (layerVersion) => layerVersion.Version
    )

    const promises = []

    // eslint-disable-next-line
    for (const layerVersion of layerVersions) {
      promises.push(removeLayerVersion(instance, clients, layerVersion))
    }

    await Promise.all(promises)

    // eslint-disable-next-line
    console.log(`Layer "${instance.name}" was successfully removed`)
  } catch (e) {
    if (e.code !== 'ResourceNotFoundException') {
      throw e
    }
  }
}

module.exports = {
  deployLayer,
  removeLayer,
  getClients,
  sleep
}
