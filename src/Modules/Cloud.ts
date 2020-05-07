'use strict';

// Internal Modules
import { Backuplet } from './Backuplet';

// Types
import { ReadStream } from 'fs';

export class Cloud
{
	public readonly conflict: ({intervalTimestamp, backuplet}: {intervalTimestamp: number, backuplet: Backuplet}) => Promise<boolean>;
	public readonly upload: ({readStream, fileName, fileExtension, intervalTimestamp, backuplet}: {readStream: ReadStream, fileName: string, fileExtension: string, intervalTimestamp: number, backuplet: Backuplet}) => Promise<void>;
	constructor({conflict, upload}: Pick<Cloud, 'conflict' | 'upload'>)
	{
		this.conflict = conflict;
		this.upload = upload;
	};
};