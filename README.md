# AwsLambdaLayer
A serverless component that provisions a Lambda layer.

## Usage

### Declarative



```yml

name: my-aws-lambda
stage: dev

AwsLambdaLayer@0.1.2::my-layer:
  name: my-layer
  description: My Serverless Layer
  code: ./code
  regoin: us-east-1
  runtimes: [ 'nodejs8.10' ] # the default is undefined (aka. all runtimes supported)
  
  # a path prefix to all the files that would be included in the package
  # this example would package a valid node dependency
  # since this is the path expected by aws
  prefix: nodejs/node_modules
  
  # if you'd like to include any files outside the codebase
  include:
    - ../shims/shim.js 
  
  # specifying a deployment bucket would optimise deployment speed
  # by using accelerated multipart uploads
  bucket: my-deployment-bucket
```

### Programatic

```js
npm i --save @serverless/aws-lambda-layer
```

```js

const layer = await this.load('@serverless/aws-lambda-layer')

const inputs = {
  name: 'serverless',
  description: 'Serverless Layer',
  code: './code',
  runtimes: undefined,
  prefix: undefined,
  include: [],
  bucket: undefined,
  region: 'us-east-1'
}

await layer(inputs)

```
