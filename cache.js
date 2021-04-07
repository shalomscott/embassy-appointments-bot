const debug = require('debug')('cache');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE;

/** @returns {Promise<any>} */
function getCache(instanceId) {
	debug('Fetching cache from DynamoDB...');
	return docClient
		.get({
			TableName: DYNAMODB_TABLE,
			Key: { InstanceId: instanceId },
		})
		.promise()
		.then(({ Item }) => {
			if (!Item) {
				debug('No cache exists');
				return;
			}
			const { InstanceId, ...cache } = Item;
			debug('Retrieved:', cache);
			return cache;
		});
}

/** @returns {Promise<void>} */
function updateCache(instanceId, cache) {
	debug('Updating cache:', cache);
	return docClient
		.put({
			TableName: DYNAMODB_TABLE,
			Item: { InstanceId: instanceId, ...cache },
		})
		.promise()
		.then(() => debug('Cache updated'));
}

module.exports = {
	getCache,
	updateCache,
};
