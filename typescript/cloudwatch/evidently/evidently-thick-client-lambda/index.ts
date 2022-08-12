import * as appconfig from 'aws-cdk-lib/aws-appconfig'
import * as cdk from 'aws-cdk-lib'
import * as evidently from 'aws-cdk-lib/aws-evidently'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as fs from'fs'

const HIDE_FEATURE = 'hideFeature'
const SHOW_FEATURE = 'showFeature'

export class EvidentlyThickClientLambdaStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const application = new appconfig.CfnApplication(this,'AppConfigApplication', {
      name: 'EvidentlyExampleProject'
    });

    new appconfig.CfnEnvironment(this, 'AppConfigEnvironment', {
      applicationId: application.ref,
      name: application.name + 'Environment'
    });

    const project = new evidently.CfnProject(this, 'EvidentlyProject', {
      name: application.name
    });

    const feature = new evidently.CfnFeature(this, 'EvidentlyFeature', {
      project: project.name,
      name: 'MyExampleFeature',
      variations: [
        {
          booleanValue: false,
          variationName: HIDE_FEATURE
        },
        {
          booleanValue: true,
          variationName: SHOW_FEATURE
        }
      ]
    })

    feature.addDependsOn(project)

    new evidently.CfnLaunch(this, 'EvidentlyLaunch', {
      project: project.name,
      name: 'ExampleFeatureLaunch',
      executionStatus: {
        status: 'START'
      },
      groups: [
        {
          feature: feature.name,
          variation: HIDE_FEATURE,
          groupName: HIDE_FEATURE
        },
        {
          feature: feature.name,
          variation: SHOW_FEATURE,
          groupName: SHOW_FEATURE
        }
      ],
      scheduledSplitsConfig: [{
        startTime: '2022-01-19T06:30:00Z',
        groupWeights: [
          {
            groupName: HIDE_FEATURE,
            splitWeight: 90000
          },
          {
            groupName: SHOW_FEATURE,
            splitWeight: 10000
          }
        ]
      }]
    })

    // https://github.com/ScottHand/aws-cdk-examples/blob/appconfig-hosted-configuration/typescript/appconfig-hosted-configuration-lambda-extension/index.ts
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      code: new lambda.InlineCode(fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' })),
      handler: 'index.main',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_9,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(this, 'ThickClientLayer', 'arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:1')
      ]
    });

    lambdaFunction.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCloudWatchEvidentlyFullAccess'))
  }
}

const app = new cdk.App();
new EvidentlyThickClientLambdaStack(app, 'EvidentlyThickClientLambda');
app.synth();
