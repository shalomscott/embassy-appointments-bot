module.exports = {
	getCacheHandler(mode) {
		switch (mode) {
			case 'aws':
				return require('./aws-cache');
			case 'local':
				return require('./local-cache');
		}
	},
};
