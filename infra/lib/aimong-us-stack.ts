import path from 'node:path'
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

const REPO_ROOT = path.resolve(import.meta.dirname, '../..')
const API_PORT = 3000
const VPC_CIDR = '10.0.0.0/16'
const CLOUDFRONT_ORIGIN_PREFIX_LIST = 'com.amazonaws.global.cloudfront.origin-facing'
const WEBSOCKET_IDLE_TIMEOUT = cdk.Duration.minutes(5)

// Cheapest Bedrock text model reachable from eu-north-1 (EU cross-Region inference profile)
const BEDROCK_MODEL_ID = 'eu.amazon.nova-micro-v1:0'
const BEDROCK_FOUNDATION_MODEL = 'amazon.nova-micro-v1:0'

export class AimongUsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Public subnets for the API task (egress to Neon and Bedrock without a NAT gateway),
    // isolated subnets for the internal load balancer that only CloudFront reaches.
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(VPC_CIDR),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    })

    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', { vpc })
    const cloudFrontPrefixList = ec2.PrefixList.fromLookup(this, 'CloudFrontPrefixList', {
      prefixListName: CLOUDFRONT_ORIGIN_PREFIX_LIST,
    })
    albSecurityGroup.addIngressRule(
      ec2.Peer.prefixList(cloudFrontPrefixList.prefixListId),
      ec2.Port.tcp(80),
      'CloudFront VPC origin',
    )

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroup: albSecurityGroup,
      idleTimeout: WEBSOCKET_IDLE_TIMEOUT,
    })

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // Serve index.html for client-side routes (anything without a file extension)
    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request
  if (!request.uri.includes('.')) request.uri = '/index.html'
  return request
}`),
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        functionAssociations: [
          { function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: origins.VpcOrigin.withApplicationLoadBalancer(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            readTimeout: cdk.Duration.seconds(60),
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: true,
        },
      },
    })
    const webOrigin = `https://${distribution.distributionDomainName}`

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc, containerInsightsV2: ecs.ContainerInsights.DISABLED })

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    })

    const parameter = (name: string) =>
      ecs.Secret.fromSsmParameter(
        ssm.StringParameter.fromSecureStringParameterAttributes(this, `Param${name}`, {
          parameterName: `/aimong-us/${name}`,
        }),
      )

    taskDefinition.addContainer('api', {
      image: ecs.ContainerImage.fromAsset(REPO_ROOT, {
        file: 'apps/api/Dockerfile',
        platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64,
      }),
      portMappings: [{ containerPort: API_PORT }],
      environment: {
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        WEB_ORIGIN: webOrigin,
        BETTER_AUTH_URL: webOrigin,
        TRUSTED_PROXIES: VPC_CIDR,
        BEDROCK_MODEL_ID,
      },
      secrets: {
        DATABASE_URL: parameter('database-url'),
        BETTER_AUTH_SECRET: parameter('better-auth-secret'),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'api',
        logGroup: new logs.LogGroup(this, 'ApiLogs', {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
    })

    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${BEDROCK_MODEL_ID}`,
          `arn:aws:bedrock:eu-*::foundation-model/${BEDROCK_FOUNDATION_MODEL}`,
        ],
      }),
    )

    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ApiSecurityGroup', { vpc })
    serviceSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(API_PORT), 'Load balancer')

    // Game rooms live in memory, so exactly one task runs and deploys replace it instead of overlapping
    const service = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [serviceSecurityGroup],
      circuitBreaker: { rollback: true },
    })

    alb.addListener('Http', { port: 80, open: false }).addTargets('Api', {
      port: API_PORT,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      deregistrationDelay: cdk.Duration.seconds(10),
      healthCheck: { path: '/api/health', healthyHttpCodes: '200' },
    })

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(path.join(REPO_ROOT, 'apps/web/dist'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    })

    new cdk.CfnOutput(this, 'Url', { value: webOrigin })
  }
}
