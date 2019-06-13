const path = require('path')
const { tmpdir } = require('os')
const crypto = require('crypto')
const { readFile } = require('fs-extra')
const { equals, not, pick } = require('ramda')
const { utils } = require('@serverless/core')

const pack = async (code, prefix, include = []) => {
  if (utils.isArchivePath(code)) {
    return path.resolve(code)
  }
  const pkgJsonPath = path.resolve(path.join(code, '..', 'package.json'))

  let outputFilePath

  if (await utils.fileExists(pkgJsonPath)) {
    const pkgJsonHash = crypto
      .createHash('sha256')
      .update(await readFile(pkgJsonPath))
      .digest('hex')
      .substring(0, 6)

    outputFilePath = path.join(tmpdir(), `${pkgJsonHash}.zip`)
  } else {
    const random = Math.random()
      .toString(36)
      .substring(6)
    outputFilePath = path.join(tmpdir(), `${random}.zip`)
  }

  if (await utils.fileExists(outputFilePath)) {
    return outputFilePath
  }
  return utils.packDir(code, outputFilePath, include, [], prefix)
}

const publishLayer = async ({ lambda, name, description, runtimes, zipPath, bucket }) => {
  const params = {
    Content: {},
    LayerName: name,
    CompatibleRuntimes: runtimes,
    Description: description
  }

  if (bucket) {
    params.Content.S3Bucket = bucket
    params.Content.S3Key = path.basename(zipPath)
  } else {
    params.Content.ZipFile = await readFile(zipPath)
  }

  const res = await lambda.publishLayerVersion(params).promise()

  return res.LayerVersionArn
}

const getLayer = async (lambda, arn) => {
  if (!arn) {
    return undefined
  }
  const name = arn.split(':')[arn.split(':').length - 2]
  const version = Number(arn.split(':')[arn.split(':').length - 1])

  const params = {
    LayerName: name,
    VersionNumber: version
  }

  try {
    const res = await lambda.getLayerVersion(params).promise()

    return {
      name,
      description: res.Description,
      hash: res.Content.CodeSha256,
      runtimes: res.CompatibleRuntimes,
      arn: res.LayerVersionArn
    }
  } catch (e) {
    if (e.code === 'ResourceNotFoundException') {
      return undefined
    }
    throw e
  }
}

const deleteLayer = async (lambda, arn) => {
  const [name, version] = arn.split(':').slice(-2)

  const params = {
    LayerName: name,
    VersionNumber: version
  }

  await lambda.deleteLayerVersion(params).promise()
}

const configChanged = (prevLayer = {}, layer) => {
  const keys = ['description', 'hash', 'runtimes', 'bucket']
  const inputs = pick(keys, layer)
  const prevInputs = pick(keys, prevLayer)
  return not(equals(inputs, prevInputs))
}

module.exports = {
  pack,
  publishLayer,
  deleteLayer,
  getLayer,
  configChanged
}
