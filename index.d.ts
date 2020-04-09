declare module '@chris-talman/rethink-backup-cloud'
{
	// External Modules
	import { ArchiveOptions } from '@chris-talman/rethink-backup';
	// Module
	export type Cloud = CloudGoogle | CloudAws;
	interface BaseCloud
	{
		name: CloudName;
		path?: Array<string>;
	}
	type CloudName = 'google' | 'aws';
	interface CloudGoogle extends BaseCloud
	{
		name: 'google';
		email: string;
		key: string;
		bucket: string;
	}
	interface CloudAws extends BaseCloud
	{
		name: 'aws';
		accessKeyId: string;
		secretAccessKey: string;
		region: string;
		version: string;
		endpoint: string;
		bucket: string;
	}
	export function backupOnce({intervalMilliseconds, cloud, archiveOptions}: {intervalMilliseconds: number, cloud: Cloud, archiveOptions: ArchiveOptions}): Promise <void>;
}