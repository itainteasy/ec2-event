## Usage

```javascript
var AWS = require('aws-sdk');
var _ = require('underscore');
var awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "us-east-1"
};

_.defaults(AWS.config, awsConfig);

var ec2Config = {
  ImageId: 'ami-5a75b432', // Ubuntu 12.04 LTS
  InstanceType: 't1.micro',
  MinCount: 1,
  MaxCount: 1,
  KeyName: KEY_PAIR_NAME
};

var ec2 = new EC2(ec2Config);

ec2.on('running', function(data) {
  console.log('running');
  ec2.terminate();
});

ec2.start()

```