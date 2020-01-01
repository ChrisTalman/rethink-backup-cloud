'use strict';

// External Modules
import AWS from 'aws-sdk';

// Intenral Modules
import { config } from 'src/Modules/Config';
import { generateStorageFilePath } from './';
import { Cloud } from './Cloud';

// Types
import { ReadStream } from 'fs';
import { S3 } from 'aws-sdk';

// Cloud
export const awsCloud = new Cloud
(
	{
		conflict: isAlreadyArchived,
		upload: executeUpload
	}
);

async function isAlreadyArchived({intervalTimestamp}: {intervalTimestamp: number})
{
	if (config.cloud.name !== 'aws') throw new Error('Config not found for AWS');
	const s3 = getStorageInterface();
	const path = generateStorageFilePath({intervalTimestamp});
	const objects = await listObjects
	(
		{
			parameters:
			{
				Bucket: config.cloud.bucket,
				Prefix: path
			},
			s3
		}
	);
	if (!objects.Contents)
	{
		throw new Error('Objects \'contents\' not found in object');
	};
	if (objects.Contents.length > 0)
	{
		return true;
	};
	return false;
};

async function executeUpload({readStream, intervalTimestamp}: {readStream: ReadStream, fileName: string, fileExtension: string, intervalTimestamp: number})
{
	if (config.cloud.name !== 'aws') throw new Error('Config not found for AWS');
	const s3 = getStorageInterface();
	const path = generateStorageFilePath({intervalTimestamp});
	await upload
	(
		{
			parameters:
			{
				Bucket: config.cloud.bucket,
				Key: path,
				Body: readStream
			},
			s3
		}
	);
};

function getStorageInterface()
{
	if (config.cloud.name !== 'aws') throw new Error('Config not found for AWS');
	AWS.config.update({accessKeyId: config.cloud.accessKeyId, secretAccessKey: config.cloud.secretAccessKey});
	const endpoint = new AWS.Endpoint(config.cloud.endpoint);
	const s3 = new AWS.S3({apiVersion: config.cloud.version, endpoint: endpoint as unknown as string});
	return s3;
};

export function upload({parameters, s3}: {parameters: S3.PutObjectRequest, s3: S3})
{
	const promise = new Promise <S3.ManagedUpload.SendData>
	(
		(resolve, reject) => s3.upload
		(
			parameters, (error, result) =>
			{
				if (error) reject(error);
				else resolve(result);
			}
		)
	);
	return promise;
};

export function listObjects({parameters, s3}: {parameters: S3.ListObjectsV2Request, s3: S3})
{
	const promise = new Promise <S3.ListObjectsV2Output>
	(
		(resolve, reject) => s3.listObjectsV2
		(
			parameters, (error, result) =>
			{
				if (error) reject(error);
				else resolve(result);
			}
		)
	);
	return promise;
};