'use strict';

// External Modules
import { ReadStream } from 'fs';
import { Storage as GoogleStorage, File } from '@google-cloud/storage';
import { PromiseController } from '@chris-talman/isomorphic-utilities';

// Intenral Modules
import { config } from 'src/Modules/Config';
import { generateStorageFilePath } from './';
import { Cloud } from './Cloud';

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
	const [ files ] = await bucket.getFiles({prefix: generateStorageFilePath({intervalTimestamp})});
	const alreadyArchived = files.length > 0;
	return alreadyArchived;
};

export function upload({readStream, intervalTimestamp}: {readStream: ReadStream, fileExtension: string, intervalTimestamp: number})
{
	if (config.cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const bucket = getBucket();
	const path = generateStorageFilePath({intervalTimestamp});
	const file = new File(bucket, path);
	const promiseController = new PromiseController();
	readStream.pipe(file.createWriteStream());
	readStream.on('error', error => promiseController.reject(error));
	readStream.on('close', () => promiseController.resolve(undefined));
	readStream.on('finish', () => promiseController.resolve(undefined));
	return promiseController.promise;
};

function getBucket()
{
	if (config.cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const storage = new GoogleStorage({credentials: {client_email: config.cloud.email, private_key: config.cloud.key}});
	const bucket = storage.bucket(config.cloud.bucket);
	return bucket;
};