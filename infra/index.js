"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const synced = require("@pulumi/synced-folder");

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: "us-west-2" }) };

const mainVpc = new aws.ec2.Vpc("mainVpc", {
    cidrBlock: "10.0.0.0/16",
    tags: {
        Name: "osgtMainVpc",
    },
});

const publicSubnet = new aws.ec2.Subnet("publicSubnet", {
    vpcId: mainVpc.id,
    cidrBlock: "10.0.0.0/20",
    tags: {
        Name: "osgtPublicSubnet",
    },
},{
    dependsOn:[
        mainVpc
    ]
});

const privateSubnet = new aws.ec2.Subnet("privateSubnet", {
    vpcId: mainVpc.id,
    cidrBlock: "10.0.128.0/20",
    tags: {
        Name: "osgtPrivateSubnet",
    },
},{
    dependsOn:[
        mainVpc
    ]
});

const igw = new aws.ec2.InternetGateway("igw", {
    vpcId: mainVpc.id,
    tags: {
        Name: "mainIgw",
    },
},{
    dependsOn:[
        mainVpc
    ]
});
const eIP = new aws.ec2.Eip("eIP",{
    domain: "vpc",
},{
    dependsOn: [igw],
})

const nat = new aws.ec2.NatGateway("nat", {
    allocationId: eIP.id,
    subnetId: publicSubnet.id,
    tags: {
        Name: "gwNAT",
    },
}, {
    dependsOn: [publicSubnet,eIP],
});

const publicRt = new aws.ec2.RouteTable("publicRt", {
    vpcId: mainVpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: igw.id,
        }
    ],
    tags: {
        Name: "privateRt",
    },
}, {
    dependsOn: [publicSubnet],
});

const publicRouteTableAssociation = new aws.ec2.RouteTableAssociation("publicRouteTableAssociation", {
    subnetId: publicSubnet.id,
    routeTableId: publicRt.id,
}, {
    dependsOn: [publicRt],
});
const privateRt = new aws.ec2.RouteTable("privateRt", {
    vpcId: mainVpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            natGatewayId: nat.id,
        }
    ],
    tags: {
        Name: "publicRt",
    },
},{
    dependsOn:[
    privateSubnet
    ]
});

const privateRouteTableAssociation = new aws.ec2.RouteTableAssociation("privateRouteTableAssociation", {
    subnetId: privateSubnet.id,
    routeTableId: privateRt.id,
},{
    dependsOn:[
    privateRt
    ]
});

const mainSg = new aws.ec2.SecurityGroup("mainSg",{
	vpcId: mainVpc.id,
	sescription: "Allows traffic between and among nodes",
	ingress: [
		{
			protocol:       "tcp",
			toPort:         22,
			fromPort:       22,
			description:    "Allow TCP 22 from hosts",
			//SecurityGroups: pulumi.StringArray{sshSecGrp.ID()},
		},
		{
			protocol:    "-1",
			toPort:      0,
			fromPort:    0,
			description: "Allow all from this security group",
			self:        true,
		},
	],
	egress: [
		{
			protocol:    "-1",
			toPort:      0,
			fromPort:    0,
			description: "Allow all outbound traffic",
			cidrBlocks:  ["0.0.0.0/0"],
		},
	],
    tags: {
        Name: "mainSg",
    },
},{
    dependsOn:[
    mainVpc
    ]
});

const osgtBucket = new aws.s3.BucketV2("osgtBucket", {});

const lambdaBucketObjectv2 = new aws.s3.BucketObjectv2("lambdaBucketObjectv2", {
    bucket: osgtBucket.id,
    key: "lambda/osgt-admin-v1.zip",
    source: new pulumi.asset.FileArchive("../admin"),
});


const Equeue = new aws.sqs.Queue("ESQS", {
    contentBasedDeduplication: true,
    fifoQueue: true,
});
const Pqueue = new aws.sqs.Queue("PSQS", {
    contentBasedDeduplication: true,
    fifoQueue: true,
});
const Squeue = new aws.sqs.Queue("SSQS", {
    contentBasedDeduplication: true,
    fifoQueue: true,
});

//Lambda
const iamForLambda = new aws.iam.Role("iamForLambda", {assumeRolePolicy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""

    }
  ]
}`
});

new aws.iam.RolePolicyAttachment("iamForLambda1", {
  role: iamForLambda,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
},{
    dependsOn:[
    iamForLambda
    ]
});
const iam1 =  new aws.iam.RolePolicyAttachment("iamForLambda6", {
  role: iamForLambda,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
},{
    dependsOn:[
    iamForLambda
    ]
});

const iam2 = new aws.iam.RolePolicyAttachment("iamForLambda2", {
  role: iamForLambda,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole",
},{
    dependsOn:[
    iamForLambda
    ]
});

const iam3 = new aws.iam.RolePolicyAttachment("iamForLambda3", {
  role: iamForLambda,
  policyArn: "arn:aws:iam::aws:policy/AWSLambda_ReadOnlyAccess",
},{
    dependsOn:[
    iamForLambda
    ]
});

const iam4 = new aws.iam.RolePolicyAttachment("iamForLambda4", {
  role: iamForLambda,
  policyArn: "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess",
},{
    dependsOn:[
    iamForLambda
    ]
});

const iam5 = new aws.iam.RolePolicyAttachment("iamForLambda5", {
  role: iamForLambda,
  policyArn: "arn:aws:iam::aws:policy/SecretsManagerReadWrite",
},{
    dependsOn:[
    iamForLambda
    ]
});

const sendEmailLambdaLogging = new aws.iam.Policy("sendEmailLambdaLogging", {
    path: "/",
    description: "IAM policy for logging from a lambda",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    }
  ]
}
`,
});
const adminApi = new aws.apigatewayv2.Api("adminApi", {
    protocolType: "HTTP"
},{
    dependsOn:[
    ]
});

const adminLambda = new aws.lambda.Function("adminLambda", {
    s3Bucket:osgtBucket.id,
    s3Key:"lambda/osgt-admin-v1.zip",
    role: iamForLambda.arn,
    handler: "app.handler",
    runtime: "nodejs16.x",
    vpcConfig:{
        securityGroupIds:[
            mainSg
        ],
        subnetIds:[
            privateSubnet.id
        ]
    },
    environment: {
        variables: {
            SECRET: "",
        },
    }},{
    dependsOn:[
    iam1,iam2,iam3,iam4,iam5,iam5,privateSubnet,adminApi]
});
const adminLambdaPermission = new aws.lambda.Permission("adminLambdaPermission", {
  action: "lambda:InvokeFunction",
  principal: "apigateway.amazonaws.com",
  function: adminLambda,
  sourceArn: pulumi.interpolate`${adminApi.executionArn}/*/*`,
}, {dependsOn: [adminLambda]});

const adminApiIntegration = new aws.apigatewayv2.Integration("adminApiIntegration", {
    apiId: adminApi.id,
    integrationType: "AWS_PROXY",
    connectionType: "INTERNET",
    description: "Lambda example",
    integrationMethod: "ANY",
    integrationUri: adminLambda.arn,
    //passthroughBehavior: "WHEN_NO_MATCH",
},{
    dependsOn:[
    adminLambda,adminApi]
});
const adminApiRoute = new aws.apigatewayv2.Route("adminApiRoute", {
    apiId: adminApi.id,
    routeKey: "ANY /{proxy+}",
    target: pulumi.interpolate`integrations/${adminApiIntegration.id}`,
},{
    dependsOn:[
    adminApiIntegration]
});
const stage = new aws.apigatewayv2.Stage("osgtDevStage", {
    apiId: adminApi.id,
    routeSettings: [
    {
      routeKey: adminApiRoute.routeKey,
      throttlingBurstLimit: 5000,
      throttlingRateLimit: 10000,
    }
  ],
    autoDeploy:"true"
},{
    dependsOn:[
    adminApi,adminApiRoute
    ]
});

//public Folder

const osgtPublicBucket = new aws.s3.BucketV2("osgtPublicBucket", {
    website: {
        indexDocument: "index.html",
        errorDocument: "error.html",
        routingRules: `[{
    "Condition": {
        "KeyPrefixEquals": "js/"
    },
    "Redirect": {
        "ReplaceKeyPrefixWith": "static/"
    }
}]
`,
    }
});

const osgtPublicBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("osgtPublicBucketPublicAccessBlock", {
    bucket: osgtPublicBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
},{
    dependsOn: [osgtPublicBucket],
});
function publicReadPolicyForBucket(bucketName) {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: "*",
      Action: [
        "s3:GetObject"
      ],
      Resource: [
        `arn:aws:s3:::${bucketName}/*` // policy refers to bucket name explicitly
      ]
    }]
  })
}
const allowAccessosgtPublicBucketPolicy = new aws.s3.BucketPolicy("allowAccessosgtPublicBucketPolicy", {
    bucket: osgtPublicBucket.bucket,
    policy: osgtPublicBucket.bucket.apply(publicReadPolicyForBucket),
},{
    dependsOn: [osgtPublicBucketPublicAccessBlock],
});

module.exports= { 
    apiUrl:stage.invokeUrl,
    PublicBucket:osgtPublicBucket.bucket,
}