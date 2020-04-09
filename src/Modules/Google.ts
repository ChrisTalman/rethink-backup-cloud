'use strict';

// External Modules
import { ReadStream } from 'fs';
import { Storage as GoogleStorage, File } from '@google-cloud/storage';
import { PromiseController } from '@chris-talman/isomorphic-utilities';

// Intenral Modules
import { generateStorageFilePath } from './';
import { Backuplet } from './Backuplet';
import { Cloud } from './Cloud';

// Cloud
export const googleCloud = new Cloud
(
	{
		conflict: isAlreadyArchived,
		upload
	}
);

async function isAlreadyArchived({intervalTimestamp, backuplet}: {intervalTimestamp: number, backuplet: Backuplet})
{
	const { cloud } = backuplet;
	if (cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const bucket = getBucket(backuplet);
	const [ files ] = await bucket.getFiles({prefix: generateStorageFilePath({intervalTimestamp, backuplet})});
	const alreadyArchived = files.length > 0;
	return alreadyArchived;
};

export function upload({readStream, intervalTimestamp, backuplet}: {readStream: ReadStream, fileExtension: string, intervalTimestamp: number, backuplet: Backuplet})
{
	const { cloud } = backuplet;
	if (cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const bucket = getBucket(backuplet);
	const path = generateStorageFilePath({intervalTimestamp, backuplet});
	const file = new File(bucket, path);
	const promiseController = new PromiseController();
	readStream.pipe(file.createWriteStream());
	readStream.on('error', error => promiseController.reject(error));
	readStream.on('close', () => promiseController.resolve(undefined));
	readStream.on('finish', () => promiseController.resolve(undefined));
	return promiseController.promise;
};

function getBucket(backuplet: Backuplet)
{
	const { cloud } = backuplet;
	if (cloud.name !== 'google') throw new Error('Config not found for Google Cloud');
	const storage = new GoogleStorage({credentials: {client_email: cloud.email, private_key: cloud.key}});
	const bucket = storage.bucket(cloud.bucket);
	return bucket;
};