const debug = require('debug')('requests');
const fetch = require('node-fetch').default;

async function requestSessionCookie(embassyCode) {
	debug(`Requesting session cookie for ${embassyCode}`);

	const response = await fetch(
		`https://evisaforms.state.gov/acs/default.asp?postcode=${embassyCode}&appcode=1`
	).then(checkStatus);
	const cookies = response.headers.raw()['set-cookie'][0];
	const sessionCookie = cookies.substring(0, cookies.indexOf(';'));

	debug(`Obtained session: ${sessionCookie}`);

	return sessionCookie;
}

async function requestMonthHtml(sessionCookie, month, year, embassyCode) {
	debug(
		`Requesting appointment schedule for ${year}-${
			month + 1
		} at ${embassyCode}`
	);

	const response = await fetch(
		`https://evisaforms.state.gov/acs/make_calendar.asp?nMonth=${
			month + 1
		}&nYear=${year}&type=2&servicetype=02B&pc=${embassyCode}`,
		{
			headers: {
				cookie: sessionCookie,
			},
		}
	).then(checkStatus);
	const html = await response.text();

	debug('Successfully obtained appointments');
	debug('Appointment HTML:\n', html);

	return html;
}

function checkStatus(
	/** @type {import('node-fetch').Response}*/
	response
) {
	if (response.ok) {
		return response;
	} else {
		throw Error(response.statusText);
	}
}

module.exports = {
	requestSessionCookie,
	requestMonthHtml,
};
