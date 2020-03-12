[![Serverless Components](https://s3.amazonaws.com/assets.github.serverless/readme-serverless-components-3.gif)](http://serverless.com)

<br/>

**AWS Lambda Layer Component** ⎯⎯⎯ The easiest way to develop & deploy AWS Lambda Layers, powered by [Serverless Components](https://github.com/serverless/components/tree/cloud).

<br/>

- [x] **Zero Configuration** - All we need is your code, then just deploy.
- [x] **Fast Deployments** - Watch for code changes and deploy in seconds.
- [x] **Team Collaboration** - Simply share layer arn and other outputs with your team.
- [x] **Easy Management** - Easily manage your layers with the Serverless Dashboard

<br/>

<img src="/assets/deploy-demo.gif" height="250" align="right">

1. [**Install**](#1-install)
2. [**Login**](#2-login)
3. [**Create**](#3-create)
4. [**Deploy**](#4-deploy)
5. [**Configure**](#5-configure)
6. [**Develop**](#6-develop)
7. [**Monitor**](#7-monitor)
8. [**Remove**](#8-remove)

&nbsp;

### 1. Install

To get started with component, install the latest version of the Serverless Framework:

```
$ npm install -g serverless
```

### 2. Login

Unlike most solutions, all component deployments run in the cloud for maximum speed and reliability. Therefore, you'll need to login to deploy, share and monitor your components.

```
$ serverless login
```

### 3. Create

You can easily create a new `aws-lambda-layer` instance just by using the following command and template url.

```
$ serverless create --template-url https://github.com/serverless/components/tree/cloud/templates/aws-lambda-layer
$ cd aws-lambda-layer
```

Then, create a new `.env` file in the root of the `aws-lambda-layer` directory right next to `serverless.yml`, and add your AWS access keys:

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

You should now have a directory that looks something like this:

```
|- src
  |- index.js
|- serverless.yml
|- .env
```

### 4. Deploy

Once you have the directory set up, you're now ready to deploy. Just run the following command from within the directory containing the `serverless.yml` file:

```
$ serverless deploy
```

Your first deployment might take a little while, but subsequent deployment would just take few seconds. For more information on what's going on during deployment, you could specify the `--debug` flag, which would view deployment logs in realtime:

```
$ serverless deploy --debug
```

### 5. Configure

The `aws-lambda-layer` component is a zero configuration component, meaning that it'll work out of the box with no configuration and sane defaults. With that said, there are still some optional configuration that you can specify.

Here's a complete reference of the `serverless.yml` file for the `aws-lambda-layer` component:

```yml
component: aws-lambda-layer      # (required) name of the component. In that case, it's aws-lambda-layer.
name: my-layer                   # (required) name of your aws-lambda-layer component instance.
org: serverlessinc               # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is dev.

inputs:
  src: ./src                     # (required) path to the source folder containing the layer logic.
  name: my-layer                 # (optional) name of your layer.
  runtimes:                      # (optional) runtimes that are compatible with this layer. default is an empty array.
    - nodejs12.x
  region: us-east-2              # (optional) aws region to deploy to. default is us-east-1.
```

Once you've chosen your configuration, run `serverless deploy` again (or simply just `serverless`) to deploy your changes.

### 6. Develop

Now that you've got your basic layer up and running, it's time to develop that into a layer that you could actual use. Instead of having to run `serverless deploy` everytime you make changes you wanna test, you could enable dev mode, which allows the CLI to watch for changes in your source directory as you develop, and deploy instantly on save.

To enable dev mode, just run the following command:

```
$ serverless dev
```

### 7. Monitor

Anytime you need to know more about your running `aws-lambda-layer` instance, you can run the following command to view the most critical info. 

```
$ serverless info
```

This is especially helpful when you want to know the outputs of your instances so that you can reference them in another instance. It also shows you the status of your instance, when it was last deployed, and how many times it was deployed. You will also see a url where you'll be able to view more info about your instance on the Serverless Dashboard.

To digg even deeper, you can pass the `--debug` flag to view the state of your component instance in case the deployment failed for any reason. 

```
$ serverless info --debug
```
### 8. Remove

If you wanna tear down your entire `aws-lambda-layer` infrastructure that was created during deployment, just run the following command in the directory containing the `serverless.yml` file. 
```
$ serverless remove
```

The `aws-lambda-layer` component will then use all the data it needs from the built-in state storage system to delete only the relavent cloud resources that it created. Just like deployment, you could also specify a `--debug` flag for realtime logs from the website component running in the cloud.

```
$ serverless remove --debug
```
