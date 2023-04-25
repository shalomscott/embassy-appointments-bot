const { readFile, writeFile } = require('fs/promises');
const debug = require('debug')('cache');

const CACHE_FILENAME = '.cache.json';

/** @returns {Promise<any>} */
async function getCache() {
	debug('Fetching cache from local file...');
	try {
		const cacheString = await readFile(CACHE_FILENAME, 'utf8');
		return JSON.parse(cacheString);
	} catch {
		debug('No cache exists');
	}
}

/** @returns {Promise<void>} */
function updateCache(cache) {
	debug('Updating cache:', cache);
	return writeFile(CACHE_FILENAME, JSON.stringify(cache), 'utf8');
}

module.exports = {
	getCache,
	updateCache,
};
