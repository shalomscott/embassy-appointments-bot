const { Parser } = require('htmlparser2');

class AvailabilityParser {
	#available = false;
	#insideApptsTable = false;

	#parser = new Parser({
		onopentag: (name, attributes) => {
			if (name === 'table' && attributes.id === 'Table3') {
				this.#insideApptsTable = true;
			}
			if (
				this.#insideApptsTable &&
				name === 'td' &&
				attributes.bgcolor &&
				attributes.bgcolor.toUpperCase() === '#FFFFC0' // '#ADD9F4'
			) {
				this.#available = true;
			}
		},
		onclosetag: (name) => {
			if (this.#insideApptsTable && name === 'table') {
				this.#insideApptsTable = false;
			}
		},
	});

	isMonthAvailable(monthHtml) {
		this.#parser.parseComplete(monthHtml);

		const available = this.#available;

		// reset instance props
		this.#available = false;
		this.#insideApptsTable = false;

		return available;
	}
}

module.exports = {
	AvailabilityParser,
};
