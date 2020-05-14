'use strict';

// External Modules
import { createReadStream, promises as FileSystemPromises } from 'fs';
const { unlink: deleteFile, readdir: readDirectory } = FileSystemPromises;
import { join as joinPath } from 'path';
import Moment from 'moment';
import { archive } from '@chris-talman/rethink-backup';
import { listenUnhandledErrors, initialiseGracefulExitHandler } from '@chris-talman/node-utilities';

// Intenral Modules
import { getConfig } from 'src/Modules/Config';
import { timerStore } from 'src/Modules/TimerStore';
import { handleGracefulExit } from 'src/Modules/GracefulExit';
import { googleCloud } from 'src/Modules/Google';
import { awsCloud } from 'src/Modules/Aws';

// Types
import { ArchiveOptions } from '@chris-talman/rethink-backup';
import { Backuplet, Cloud } from './Backuplet';

// Constants
export { CLOUD_NAME } from 'src/Modules/Config';
const FILE_EXTENSION = 'tar.xz';
const ARCHIVE_FILE_NAME_EXPRESSION = /^rethinkdb_export_[A-Z0-9]+(?:\.tar(?:\.xz)?)?$/;

initialise();
function initialise()
{
	listenUnhandledErrors();
	initialiseGracefulExitHandler(handleGracefulExit);
	initialiseAutomatic();
};

async function initialiseAutomatic()
{
	if (!getCommandOptions().includes('--initialiseAutomaticBackup')) return;
	initialiseAutomaticBackup();
};

/** Initialises a continous backup process designed for the context that the module is being directly executed as an application in its own right. */
function initialiseAutomaticBackup()
{
	const config = getConfig();
	const INTERVAL_MILLISECONDS = Moment.duration(config.data.interval).asMilliseconds();
	const { cloud, options: archiveOptions } = config.data;
	const backuplet = new Backuplet
	(
		{
			intervalMilliseconds: INTERVAL_MILLISECONDS,
			interval: true,
			errors: 'log',
			logs: true,
			cloud,
			archiveOptions
		}
	);
	backup(backuplet);
};

/** Executes backup operation once, without an interval. */
export async function backupOnce({intervalMilliseconds, logs, cloud, archiveOptions}: {intervalMilliseconds: number, logs: boolean, cloud: Cloud, archiveOptions: ArchiveOptions})
{
	const backuplet = new Backuplet
	(
		{
			interval: false,
			intervalMilliseconds,
			errors: 'throw',
			logs,
			cloud,
			archiveOptions
		}
	);
	await backup(backuplet);
};

async function backup(backuplet: Backuplet)
{
	try
	{
		await execute(backuplet);
	}
	catch (error)
	{
		if (backuplet.errors === 'throw')
		{
			throw error;
		}
		else if (backuplet.errors === 'log')
		{
			backuplet.log('Failed');
			backuplet.logError(error.stack || error);
		}
		else
		{
			throw new Error(`Unexpected error handling: ${backuplet.errors}`);
		};
	};
	if (backuplet.interval)
	{
		const timeout = setTimeout(backup, backuplet.intervalMilliseconds);
		timerStore.register(timeout);
	};
};

async function execute(backuplet: Backuplet)
{
	backuplet.log('Purging temporary files...');
	await purgeArchives(backuplet);
	const intervalTimestamp = getCurrentIntervalStartTimestamp(backuplet);
	const cloud = getCloud(backuplet);
	backuplet.log('Checking for existing archive...');
	const conflict = await cloud.conflict({intervalTimestamp, backuplet});
	if (conflict)
	{
		backuplet.log('Already archived for current interval period');
		return;
	};
	backuplet.log('Archiving...');
	const { archiveOptions } = backuplet;
	const { fileName, fileExtension } = await archive(archiveOptions);
	const readStream = createReadStream(joinPath(process.cwd(), fileName));
	backuplet.log('Uploading...');
	try
	{
		await cloud.upload({readStream, fileName, fileExtension, intervalTimestamp, backuplet});
	}
	catch (error)
	{
		throw error;
	}
	finally
	{
		try
		{
			await purgeArchives(backuplet);
		}
		catch (error)
		{
			if (backuplet.errors === 'throw')
			{
				throw error;
			}
			else if (backuplet.errors === 'log')
			{
				backuplet.logError(error.stack || error);
			}
			else
			{
				throw new Error(`Unexpected error handling: ${backuplet.errors}`);
			};
		};
	};
	backuplet.log('Archived');
};

function getCloud(backuplet: Backuplet)
{
	const { cloud } = backuplet;
	if (cloud.name === 'google')
	{
		return googleCloud;
	}
	else if (cloud.name === 'aws')
	{
		return awsCloud;
	}
	else
	{
		throw new Error('Config cloud not found');
	};
};

async function purgeArchives(backuplet: Backuplet)
{
	const promises: Array<Promise<void>> = [];
	const fileNames = await readDirectory('./');
	for (let fileName of fileNames)
	{
		const promise = purgeArchive({fileName, backuplet});
		promises.push(promise);
	};
	await Promise.all(promises);
};

async function purgeArchive({fileName, backuplet}: {fileName: string, backuplet: Backuplet})
{
	const isArchive = ARCHIVE_FILE_NAME_EXPRESSION.test(fileName);
	if (!isArchive) return;
	try
	{
		await deleteFile(joinPath(process.cwd(), fileName));
	}
	catch (error)
	{
		if (backuplet.errors === 'throw')
		{
			throw error;
		}
		else if (backuplet.errors === 'log')
		{
			backuplet.logError(error.stack || error);
			return;
		}
		else
		{
			throw new Error(`Unexpected error handling: ${backuplet.errors}`);
		};
	};
};

export function getCurrentIntervalStartTimestamp(backuplet: Backuplet)
{
	const { intervalMilliseconds } = backuplet;
	const intervalNumber = Math.floor(Date.now() / intervalMilliseconds);
	const intervalNumberTimestamp = (intervalMilliseconds * intervalNumber);
	return intervalNumberTimestamp;
};

export function generateStorageFilePath({intervalTimestamp, backuplet}: {intervalTimestamp: number, backuplet: Backuplet})
{
	const { cloud } = backuplet;
	const path = cloud.path ? cloud.path.join('/') + '/' : '';
	const name = `${path}${intervalTimestamp.toString()}.${FILE_EXTENSION}`;
	return name;
};

function getCommandOptions()
{
	const allOptions = process.argv.slice(2);
	const nodeOptions = process.execArgv;
	const commandOptions: Array<string> = [];
	for (let option of allOptions)
	{
		if (nodeOptions.includes(option)) continue;
		commandOptions.push(option);
	};
	return commandOptions;
};