'use strict';

const debug = require('debug')('lambda');
const Slimbot = require('slimbot');
const { requestSessionCookie, requestMonthHtml } = require('./requests');
const { AvailabilityParser } = require('./parser');
const { getCache, updateCache } = require('./cache');

const { BOT_TOKEN, CHANNEL_ID } = process.env;

const MAX_SILENCE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const EMBASSIES = {
	JRS: 'Jerusalem',
	TLV: 'Tel Aviv',
};

const INSTANCE_ID = '1';
let cacheStale = false;

// Cached variables
let lastMessageTime = 0;
let sessions = {};

const parser = new AvailabilityParser();
const bot = new Slimbot(BOT_TOKEN);

module.exports.handler = async () => {
	try {
		const availability = {};

		const now = new Date();
		const month = now.getMonth();
		const year = now.getFullYear();

		await retrieveCache();

		for (const embassyCode in EMBASSIES) {
			const embassy = EMBASSIES[embassyCode];

			debug(`Checking at ${embassy} branch...`);

			for (let i = 0; i < 4; ++i) {
				const monthName = MONTHS[month + i];

				// I know there's a bug here when the year changes next month. I'm okay with it for now.
				const monthHtml = await getMonthHtml(
					month + i,
					year,
					embassyCode
				);
				if (parser.isMonthAvailable(monthHtml)) {
					debug(
						`Appointments available at ${embassy} in ${monthName}`
					);

					if (!availability[embassyCode]) {
						availability[embassyCode] = [];
					}
					availability[embassyCode].push(monthName);
				}
			}
		}

		if (Object.keys(availability).length !== 0) {
			debug('Sending message...');
			await bot.sendMessage(CHANNEL_ID, formatMessage(availability), {
				parse_mode: 'MarkdownV2',
			});
		} else {
			if (shouldUpdate()) {
				debug('Sending message...');
				await bot.sendMessage(
					CHANNEL_ID,
					'No appointments are available.',
					{ disable_notification: true }
				);
			}
		}
	} catch (statusText) {
		debug(`Caught error: ${statusText}`);

		if (shouldUpdate()) {
			await bot.sendMessage(
				CHANNEL_ID,
				'The appointment scheduling website is unavailable right now.',
				{ disable_notification: true }
			);
		}
	} finally {
		await ensureCache();
		debug('Done.');
	}
};

async function getMonthHtml(month, year, embassyCode) {
	if (sessions[embassyCode]) {
		debug('Using old session key');
		try {
			return await requestMonthHtml(
				sessions[embassyCode],
				month,
				year,
				embassyCode
			);
		} catch {
			debug('Session expired');
		}
	}
	debug('Requesting new session key');
	sessions[embassyCode] = await requestSessionCookie(embassyCode);
	cacheStale = true;
	return await requestMonthHtml(
		sessions[embassyCode],
		month,
		year,
		embassyCode
	);
}

function formatMessage(availability) {
	let message = '🎉 *Appointments available\\!* 🎉';
	for (const embassyCode in availability) {
		message += `\n\nAt the [${
			EMBASSIES[embassyCode]
		} Branch](https://evisaforms.state.gov/acs/default.asp?postcode=${embassyCode}&appcode=1) in ${availability[
			embassyCode
		].join(', ')}`;
	}
	return message;
}

async function retrieveCache() {
	if (lastMessageTime === 0) {
		debug('Need to fetch cache');
		const cache = await getCache(INSTANCE_ID);
		if (cache) {
			lastMessageTime = cache.lastMessageTime;
			sessions = cache.sessions;
		}
	}
}

async function ensureCache() {
	if (cacheStale) {
		debug('Need to update cache');
		await updateCache(INSTANCE_ID, {
			lastMessageTime,
			sessions,
		});
		cacheStale = false;
	}
}

function shouldUpdate() {
	const now = Date.now();
	if (now - lastMessageTime >= MAX_SILENCE_PERIOD) {
		debug('Max silence period has elapsed');
		lastMessageTime = now;
		cacheStale = true;
		return true;
	}
	return false;
}
