'use strict';

// External Modules
import { mirror } from '@chris-talman/isomorphic-utilities';

// Types
import { ArchiveOptions } from '@chris-talman/rethink-backup';
export type Cloud = CloudGoogle | CloudAws;
interface BaseCloud
{
	name: CloudName;
	path?: Array<string>;
};
type CloudName = keyof typeof CLOUD_NAME;
interface CloudGoogle extends BaseCloud
{
	name: typeof CLOUD_NAME.google;
	email: string;
	key: string;
	bucket: string;
};
interface CloudAws extends BaseCloud
{
	name: typeof CLOUD_NAME.aws;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	version: string;
	endpoint: string;
	bucket: string;
};

// Constants
const CLOUD_NAME = mirror
(
	{
		google: true,
		aws: true
	}
);

export class Backuplet
{
	public readonly interval: boolean;
	public readonly intervalMilliseconds: number;
	public readonly errors: 'throw' | 'log';
	public readonly cloud: Cloud;
	public readonly archiveOptions: ArchiveOptions;
	constructor({interval, intervalMilliseconds, errors, cloud, archiveOptions}: Pick<Backuplet, 'interval' | 'intervalMilliseconds' | 'errors' | 'cloud' | 'archiveOptions'>)
	{
		this.interval = interval;
		this.intervalMilliseconds = intervalMilliseconds;
		this.errors = errors;
		this.cloud = cloud;
		this.archiveOptions = archiveOptions;
	};
};