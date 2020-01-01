'use strict';

// External Modules
import { createReadStream, promises as FileSystemPromises } from 'fs';
const { unlink: deleteFile, readdir: readDirectory } = FileSystemPromises;
import { join as joinPath } from 'path';
import Moment from 'moment';
import { archive } from '@chris-talman/rethink-backup';
import { listenUnhandledErrors } from '@chris-talman/node-utilities';

// Intenral Modules
import { config } from 'src/Modules/Config';
import { googleCloud } from 'src/Modules/Google';
import { awsCloud } from 'src/Modules/Aws';

// Types
import { ReadStream } from 'fs';

// Constants
const FILE_EXTENSION = 'tar.xz';
const ARCHIVE_FILE_NAME_EXPRESSION = /^rethinkdb_export_[A-Z0-9]+(?:\.tar(?:\.xz)?)?$/;
export const INTERVAL_MILLISECONDS = Moment.duration(config.interval).asMilliseconds();

listenUnhandledErrors();
backup();
async function backup()
{
	try
	{
		await execute();
	}
	catch (error)
	{
		console.log('Failed');
		console.error(error.stack || error);
	};
	setTimeout(backup, INTERVAL_MILLISECONDS);
};

async function execute()
{
	console.log('Purging temporary files...');
	await purgeArchives();
	const intervalTimestamp = getCurrentIntervalStartTimestamp();
	const cloud = getCloud();
	console.log('Checking for existing archive...');
	const conflict = await cloud.conflict({intervalTimestamp});
	if (conflict)
	{
		console.log('Already archived for current interval period');
		return;
	};
	console.log('Archiving...');
	const { fileName, fileExtension } = await archive({rethink: config.rethink.connection});
	const readStream = createReadStream(joinPath(process.cwd(), fileName));
	console.log('Uploading archive...');
	try
	{
		await cloud.upload({readStream, fileName, fileExtension, intervalTimestamp});
	}
	catch (error)
	{
		throw error;
	}
	finally
	{
		try
		{
			await deleteFile(joinPath(process.cwd(), fileName));
		}
		catch (error)
		{
			console.error(error.stack || error);
		};
	};
	console.log('Archived');
};

function getCloud()
{
	if (config.cloud.name === 'google')
	{
		return googleCloud;
	}
	else if (config.cloud.name === 'aws')
	{
		return awsCloud;
	}
	else
	{
		throw new Error('Config cloud not found');
	};
};

async function purgeArchives()
{
	const promises: Array<Promise<void>> = [];
	const fileNames = await readDirectory('./');
	for (let fileName of fileNames)
	{
		const promise = purgeArchive({fileName});
		promises.push(promise);
	};
	await Promise.all(promises);
};

async function purgeArchive({fileName}: {fileName: string})
{
	const isArchive = ARCHIVE_FILE_NAME_EXPRESSION.test(fileName);
	if (!isArchive) return;
	try
	{
		await deleteFile(joinPath(process.cwd(), fileName));
	}
	catch (error)
	{
		console.error(error.stack || error);
		return;
	};
};

export function getCurrentIntervalStartTimestamp()
{
	const intervalNumber = Math.floor(Date.now() / INTERVAL_MILLISECONDS);
	const intervalNumberTimestamp = (INTERVAL_MILLISECONDS * intervalNumber);
	return intervalNumberTimestamp;
};

export function generateStorageFileName({intervalTimestamp}: {intervalTimestamp: number})
{
	const name = intervalTimestamp.toString() + '.' + FILE_EXTENSION;
	return name;
};

export class Cloud
{
	public readonly conflict: ({intervalTimestamp}: {intervalTimestamp: number}) => Promise<boolean>;
	public readonly upload: ({readStream, fileName, fileExtension, intervalTimestamp}: {readStream: ReadStream, fileName: string, fileExtension: string, intervalTimestamp: number}) => Promise<void>;
	constructor({conflict, upload}: {conflict: Cloud['conflict'], upload: Cloud['upload']})
	{
		this.conflict = conflict;
		this.upload = upload;
	};
};