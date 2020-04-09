'use strict';

// External Modules
import AWS from 'aws-sdk';

// Intenral Modules
import { generateStorageFilePath } from './';
import { Backuplet } from './Backuplet';
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

async function isAlreadyArchived({intervalTimestamp, backuplet}: {intervalTimestamp: number, backuplet: Backuplet})
{
	const { cloud } = backuplet;
	if (cloud.name !== 'aws') throw new Error('Config not found for AWS');
	const s3 = getStorageInterface(backuplet);
	const path = generateStorageFilePath({intervalTimestamp, backuplet});
	const objects = await listObjects
	(
		{
			parameters:
			{
				Bucket: cloud.bucket,
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

async function executeUpload({readStream, intervalTimestamp, backuplet}: {readStream: ReadStream, fileName: string, fileExtension: string, intervalTimestamp: number, backuplet: Backuplet})
{
	const { cloud } = backuplet;
	if (cloud.name !== 'aws') throw new Error('Config not found for AWS');
	const s3 = getStorageInterface(backuplet);
	const path = generateStorageFilePath({intervalTimestamp, backuplet});
	await upload
	(
		{
			parameters:
			{
				Bucket: cloud.bucket,
				Key: path,
				Body: readStream
			},
			s3
		}
	);
};

function getStorageInterface(backuplet: Backuplet)
{
	const { cloud } = backuplet;
	if (cloud.name !== 'aws') throw new Error('Config not found for AWS');
	AWS.config.update({accessKeyId: cloud.accessKeyId, secretAccessKey: cloud.secretAccessKey});
	const endpoint = new AWS.Endpoint(cloud.endpoint);
	const s3 = new AWS.S3({apiVersion: cloud.version, endpoint: endpoint as unknown as string});
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