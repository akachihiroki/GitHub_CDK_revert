import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { test } from '@jest/globals';
import { GitHubCdkStack } from '../lib/git_hub_cdk-stack';

test('S3 Bucket Created', () => {
	const app = new App();
	const stack = new GitHubCdkStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);

	template.resourceCountIs('AWS::S3::Bucket', 1);
	template.hasResourceProperties('AWS::S3::Bucket', {
		VersioningConfiguration: {
			Status: 'Enabled',
		},
		BucketEncryption: {
			ServerSideEncryptionConfiguration: [
				{
					ServerSideEncryptionByDefault: {
						SSEAlgorithm: 'AES256',
					},
				},
			],
		},
		PublicAccessBlockConfiguration: {
			BlockPublicAcls: true,
			BlockPublicPolicy: true,
			IgnorePublicAcls: true,
			RestrictPublicBuckets: true,
		},
	});
});
