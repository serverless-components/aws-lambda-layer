const { Component } = require('@serverless/core')
const { getClients, deployLayer, removeLayer } = require('./utils')

class AwsLambdaLayer extends Component {
  async deploy(inputs = {}) {
    inputs.region = inputs.region || 'us-east-1'
    const clients = getClients(this.credentials.aws, inputs.region)

    await deployLayer(this, inputs, clients)

    return {
      name: this.state.name,
      region: this.state.region,
      version: this.state.version,
      arn: this.state.arn,
      arnVersion: this.state.versionArn
    }
  }

  async remove() {
    if (!this.state.name) {
      // eslint-disable-next-line
      console.log(`State is empty. Nothing to remove.`)
    }
    const clients = getClients(this.credentials.aws, this.state.region)

    await removeLayer(this, clients)

    this.state = {}
    return {}
  }
}

module.exports = AwsLambdaLayer
