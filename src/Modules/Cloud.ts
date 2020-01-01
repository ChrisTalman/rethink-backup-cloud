'use strict';

// Types
import { ReadStream } from 'fs';

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