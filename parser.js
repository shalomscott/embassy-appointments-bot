const { Parser } = require('htmlparser2');

class AvailabilityParser {
	#bookable = false;
	#available = false;
	#insideApptsTable = false;

	#parser = new Parser({
		onopentag: (name, attributes) => {
			if (name === 'table' && attributes.id === 'Table3') {
				this.#insideApptsTable = true;
			}
			if (this.#insideApptsTable && name === 'td' && attributes.bgcolor) {
				// The case fall-through is intentional
				switch (attributes.bgcolor.toUpperCase()) {
					case '#FFFFC0':
						this.#available = true;
					case '#ADD9F4':
						this.#bookable = true;
				}
			}
		},
		onclosetag: (name) => {
			if (this.#insideApptsTable && name === 'table') {
				this.#insideApptsTable = false;
			}
		},
	});

	/** @returns {{ bookable: boolean; available: boolean; }} */
	parseMonth(monthHtml) {
		this.#parser.parseComplete(monthHtml);

		const result = {
			bookable: this.#bookable,
			available: this.#available,
		};

		// reset instance props
		this.#bookable = false;
		this.#available = false;
		this.#insideApptsTable = false;

		return result;
	}
}

module.exports = {
	AvailabilityParser,
};
