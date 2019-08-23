# aws-lambda-layer

Easily provision Layers for AWS Lambda using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;


### 1. Install

```console
$ npm install -g serverless
```

### 2. Create


```console
$ mkdir my-layer && cd my-layer
```

in the case of a nodejs layer, the directory should look something like this:


```
|- code
  |- index.js     # the root of your library
  |- package.json # the main property should point to index.js in this example
|- serverless.yml
|- .env           # your AWS api keys
```

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```


### 3. Configure

```yml
# serverless.yml

myLayer:
  component: "@serverless/aws-lambda-layer"
  inputs:
    code: ./code
    region: us-east-1
    runtimes: [ 'nodejs8.10' ] # the default is undefined (all runtimes supported)

    # a path prefix to all the files that would be included in the package
    # this example would package a valid node dependency
    # since this is the path expected by aws
    prefix: nodejs/node_modules

    # if you'd like to include any files outside the codebase
    include:
      - ../external/file.js 

    # specifying an existing deployment bucket would optimise deployment speed
    # by using accelerated multipart uploads
    bucket: my-deployment-bucket
```

### 4. Deploy

```console
$ serverless
```
For a real world example of how this component could be used, [take a look at how the aws-lambda component is using it](https://github.com/serverless-components/aws-lambda/).

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
