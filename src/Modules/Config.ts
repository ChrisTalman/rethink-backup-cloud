'use strict';

// External Modules
import Joi from 'joi';
import { mirror } from '@chris-talman/isomorphic-utilities';
import Config from '@chris-talman/config';

// Types
import { DurationInputObject as MomentDurationDefinition } from 'moment';
interface Data
{
	cloud: Cloud;
	interval: MomentDurationDefinition;
	rethink: Rethink;
};
type Cloud = CloudGoogle | CloudAws;
interface BaseCloud
{
	name: CloudName;
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
	folder?: string;
};
interface Rethink
{
	connection: RethinkConnection;
};
interface RethinkConnection
{
	server:
	{
		host: string;
		port?: number;
		tls?: boolean;
	};
	db: string;
	user: string;
	password: string;
	silent: boolean;
};

// Schema
const CLOUD_NAME = mirror
(
	{
		google: true,
		aws: true
	}
);
const MOMENT_DURATION_SCHEMA = Joi
	.object
	(
		{
			seconds: Joi.number().integer().min(0).optional(),
			minutes: Joi.number().integer().min(0).optional(),
			hours: Joi.number().integer().min(0).optional(),
			days: Joi.number().integer().min(0).optional(),
			weeks: Joi.number().integer().min(0).optional(),
			months: Joi.number().integer().min(0).optional()
		}
	)
	.min(1);
const RETHINK_SERVER_SCHEMA =
{
	host: Joi.string().required(),
	port: Joi.number().integer().greater(0).optional(),
	tls: Joi.boolean().optional()
};
const RETHINK_CONNECTION_SCHEMA =
{
	server: Joi.object(RETHINK_SERVER_SCHEMA).required(),
	db: Joi.string().required(),
	user: Joi.string().required(),
	password: Joi.string().allow('').required(),
	silent: Joi.boolean().required()
};
const RETHINK_SCHEMA =
{
	connection: Joi.object(RETHINK_CONNECTION_SCHEMA).required()
};
const SCHEMA =
{
	cloud: Joi.alternatives
	(
		{
			name: CLOUD_NAME.google,
			email: Joi.string().required(),
			key: Joi.string().required(),
			bucket: Joi.string().required()
		},
		{
			name: CLOUD_NAME.aws,
			accessKeyId: Joi.string().required(),
			secretAccessKey: Joi.string().required(),
			region: Joi.string().required(),
			version: Joi.string().required(),
			endpoint: Joi.string().required(),
			bucket: Joi.string().required(),
			folder: Joi.string().optional()
		}
	),
	interval: MOMENT_DURATION_SCHEMA,
	rethink: RETHINK_SCHEMA
};

// Data
const instance = new Config <Data> ({schema: SCHEMA});
export const config = instance.data;