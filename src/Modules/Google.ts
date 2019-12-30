'use strict';

// External Modules
import { ReadStream } from 'fs';
import { Storage as GoogleStorage, File } from '@google-cloud/storage';

// Intenral Modules
import { config } from 'src/Modules/Config';
import { generateStorageFileName, Cloud } from './';

// Cloud
export const googleCloud = new Cloud
(
	{
		conflict: isAlreadyArchived,
		upload
	}
);

async function isAlreadyArchived({intervalTimestamp}: {intervalTimestamp: number})
{
	if (config.cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const bucket = getBucket();
	bucket.getFiles({prefix: intervalTimestamp.toString()});
	return true;
};

export async function upload({readStream, intervalTimestamp}: {readStream: ReadStream, fileExtension: string, intervalTimestamp: number})
{
	if (config.cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const bucket = getBucket();
	const name = generateStorageFileName({intervalTimestamp});
	const file = new File(bucket, name);
	await file.save
	(
		readStream,
		{
			public: true,
			resumable: false,
			contentType: 'auto'
		}
	);
};

function getBucket()
{
	if (config.cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const storage = new GoogleStorage({credentials: {client_email: config.cloud.email, private_key: config.cloud.key}});
	const bucket = storage.bucket(config.cloud.bucket);
	return bucket;
};