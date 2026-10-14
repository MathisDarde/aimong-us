import * as cdk from 'aws-cdk-lib'
import { AimongUsStack } from '../lib/aimong-us-stack.js'

const app = new cdk.App()

new AimongUsStack(app, 'AimongUs', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-north-1' },
})
