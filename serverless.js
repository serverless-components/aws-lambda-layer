const aws = require('aws-sdk')
const { Component, utils } = require('@serverless/core')
const { mergeDeepRight, pick } = require('ramda')
const { pack, publishLayer, deleteLayer, getLayer, configChanged } = require('./utils')

const outputsList = ['name', 'description', 'arn', 'region']

const defaults = {
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

    config.name = this.state.name || this.context.resourceId()

    const lambda = new aws.Lambda({
      region: config.region,
      credentials: this.context.credentials.aws
    })

    this.context.debug(
      `Starting deployment of layer ${config.name} to the ${config.region} region.`
    )

    // todo we should probably remove this now that we are auto generating names
    if (this.state.name && this.state.name !== config.name) {
      this.context.status('Replacing')
      await deleteLayer(lambda, this.state.arn)
      delete this.state.arn
    }

    config.arn = this.state.arn

    this.context.status('Packaging')
    this.context.debug(`Packaging directory ${config.code} for layer ${config.name}.`)

    config.zipPath = await pack(config.code, config.prefix, config.include)
    config.hash = await utils.hashFile(config.zipPath)

    this.context.debug(`Checking if layer ${config.name} already exists.`)
    const prevLayer = await getLayer(lambda, config.arn)

    // if the user removed the bucket property, they'd want to redeploy
    // so prevLayer need to be aware of the bucket since it's not returned from aws
    if (this.state.bucket) {
      prevLayer.bucket = this.state.bucket
    }

    if (configChanged(prevLayer, config)) {
      if (config.bucket && (!prevLayer || prevLayer.hash !== config.hash)) {
        this.context.status('Uploading')
        this.context.debug(`Uploading layer package ${config.zipPath} to ${config.bucket}.`)

        const bucket = await this.load('@serverless/aws-s3')
        await bucket.upload({ name: config.bucket, file: config.zipPath })
      }
      this.context.status('Publishing')
      this.context.debug(`Publishing layer ${config.name} to the ${config.region} region.`)

      config.arn = await publishLayer({ lambda, ...config })
    }

    this.context.debug(
      `Successfully published layer ${config.name} to the ${config.region} region.`
    )
    this.context.debug(`Published layer ARN is ${config.arn}.`)

    this.state.name = config.name
    this.state.arn = config.arn
    this.state.region = config.region
    this.state.bucket = config.bucket || undefined
    await this.save()

    const outputs = pick(outputsList, config)

    return outputs
  }

  // todo remove all versions?
  async remove() {
    this.context.status('Removing')

    if (!this.state.arn) {
      this.context.debug(`Aborting removal. Layer ARN not found in state.`)
      return
    }

    const lambda = new aws.Lambda({
      region: this.state.region,
      credentials: this.context.credentials.aws
    })

    this.context.debug(`Removing layer ${this.state.name} from the ${this.state.region} region.`)

    await deleteLayer(lambda, this.state.arn)

    this.context.debug(
      `Successfully removed layer with arn ${this.state.arn} from the ${this.state.region} region.`
    )

    const outputs = pick(outputsList, this.state)

    this.state = {}
    await this.save()

    return outputs
  }
}

module.exports = AwsLambdaLayer
