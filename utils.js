const path = require('path')
const { tmpdir } = require('os')
const crypto = require('crypto')
const archiver = require('archiver')
const globby = require('globby')
const { contains, isNil, last, split, equals, not, pick } = require('ramda')
const { readFile, createReadStream, createWriteStream } = require('fs-extra')
const { utils } = require('@serverless/core')

const VALID_FORMATS = ['zip', 'tar']
const isValidFormat = (format) => contains(format, VALID_FORMATS)

const packDir = async (inputDirPath, outputFilePath, include = [], exclude = [], prefix) => {
  const format = last(split('.', outputFilePath))

  if (!isValidFormat(format)) {
    throw new Error('Please provide a valid format. Either a "zip" or a "tar"')
  }

  const patterns = ['**']

  if (!isNil(exclude)) {
    exclude.forEach((excludedItem) => patterns.push(`!${excludedItem}`))
  }

  const files = (await globby(patterns, { cwd: inputDirPath }))
    .sort() // we must sort to ensure correct hash
    .map((file) => ({
      input: path.join(inputDirPath, file),
      output: prefix ? path.join(prefix, file) : file
    }))

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFilePath)
    const archive = archiver(format, {
      zlib: { level: 9 }
    })

    output.on('open', () => {
      archive.pipe(output)

      // we must set the date to ensure correct hash
      files.forEach((file) =>
        archive.append(createReadStream(file.input), { name: file.output, date: new Date(0) })
      )

      if (!isNil(include)) {
        include.forEach((file) => {
          const stream = createReadStream(file)
          archive.append(stream, { name: path.basename(file), date: new Date(0) })
        })
      }

      archive.finalize()
    })

    archive.on('error', (err) => reject(err))
    output.on('close', () => resolve(outputFilePath))
  })
}

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
  return packDir(code, outputFilePath, include, [], prefix)
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
  packDir,
  publishLayer,
  deleteLayer,
  getLayer,
  configChanged
}
