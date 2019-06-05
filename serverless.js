const aws = require('aws-sdk')
const { Component, utils } = require('@serverless/components')
const { mergeDeepRight, pick } = require('ramda')
const { pack, publishLayer, deleteLayer, getLayer, configChanged } = require('./utils')

const outputMask = ['name', 'description', 'arn']

const defaults = {
  name: 'serverless',
  description: 'Serverless Layer',
  code: process.cwd(),
  runtimes: undefined,
  prefix: undefined,
  include: [],
  bucket: undefined,
  region: 'us-east-1'
}

class AwsLambdaLayer extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)

    const lambda = new aws.Lambda({
      region: config.region,
      credentials: this.context.credentials.aws
    })

    if (this.state.name && this.state.name !== config.name) {
      this.ui.status('Replacing')
      await deleteLayer(lambda, this.state.arn)
      delete this.state.arn
    }

    config.arn = this.state.arn

    this.ui.status('Packaging')

    config.zipPath = await pack(config.code, config.prefix, config.include)
    config.hash = await utils.hashFile(config.zipPath)

    const prevLayer = await getLayer(lambda, config.arn)

    // if the user removed the bucket property, they'd want to redeploy
    // so prevLayer need to be aware of the bucket since it's not returned from aws
    if (this.state.bucket) {
      prevLayer.bucket = this.state.bucket
    }

    if (configChanged(prevLayer, config)) {
      if (config.bucket && (!prevLayer || prevLayer.hash !== config.hash)) {
        this.ui.status('Uploading')
        const bucket = await this.load('@serverless/aws-s3')
        await bucket.upload({ name: config.bucket, file: config.zipPath })
      }
      this.ui.status('Publishing')
      config.arn = await publishLayer({ lambda, ...config })
    }

    this.state.name = config.name
    this.state.arn = config.arn
    this.state.bucket = config.bucket || undefined

    await this.save()

    const outputs = pick(outputMask, config)

    this.ui.log()
    this.ui.output('name', `       ${outputs.name}`)
    this.ui.output('description', `${outputs.description}`)
    this.ui.output('arn', `        ${outputs.arn}`)

    return outputs
  }

  // todo remove all versions?
  async remove(inputs = {}) {
    if (!inputs.arn && !this.state.arn) {
      return
    }
    this.ui.status('Removing')

    const lambda = new aws.Lambda({
      region: inputs.region || defaults.region,
      credentials: this.context.credentials.aws
    })
    const arn = inputs.arn || this.state.arn

    await deleteLayer(lambda, arn)

    this.state = {}

    await this.save()

    return { arn }
  }
}

module.exports = AwsLambdaLayer
