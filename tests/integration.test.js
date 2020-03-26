const path = require('path')
const { generateId, getCredentials, getServerlessSdk, getLayer } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

// the yaml file we're testing against
const instanceYaml = {
  org: 'serverlessinc',
  app: 'myApp',
  component: 'aws-lambda-layer@dev',
  name: `aws-lambda-layer-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    src: path.resolve(__dirname, 'src')
  }
}

// we need to keep the initial instance state after first deployment
// to validate removal later
let firstInstance

// get aws credentials from env
const credentials = getCredentials()

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

// clean up the instance after tests
afterAll(async () => {
  await sdk.remove(instanceYaml, credentials)
})

it('should successfully deploy layer', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  // store the inital state for removal validation later on
  firstInstance = instance

  expect(instance.outputs.name).toBeDefined()
  expect(instance.outputs.arn).toBeDefined()
  expect(instance.outputs.arnVersion).toBeDefined()
})

it('should successfully update layer and its runtimes', async () => {
  instanceYaml.inputs.runtimes = ['nodejs12.x']

  const instance = await sdk.deploy(instanceYaml, credentials)

  const layer = await getLayer(credentials, instance.outputs.arnVersion)

  expect(layer.LayerVersionArn).toEqual(instance.outputs.arnVersion)
  expect(layer.CompatibleRuntimes[0]).toEqual(instanceYaml.inputs.runtimes[0])
})

it('should successfully remove layer', async () => {
  await sdk.remove(instanceYaml, credentials)

  // make sure layer was actually removed
  let layer
  try {
    layer = await getLayer(credentials, firstInstance.outputs.arnVersion)
  } catch (e) {
    if (e.code !== 'ResourceNotFoundException') {
      throw e
    }
  }

  expect(layer).toBeUndefined()
})
