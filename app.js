'use strict';

const debug = require('debug')('app');
const Slimbot = require('slimbot');
const { requestSessionCookie, requestMonthHtml } = require('./requests');
const { AvailabilityParser } = require('./parser');
const { getCacheHandler } = require('./cache');

const { MODE, BOT_TOKEN, CHANNEL_ID, STOP_AT_NON_BOOKABLE_MONTH } = process.env;

const MONTHS_SEARCH_COUNT = 4;
const ONE_HOUR = 60 * 60 * 1000;
const MAX_SILENCE_PERIOD_HRS = 24;
const MAX_SILENCE_PERIOD = MAX_SILENCE_PERIOD_HRS * ONE_HOUR;

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

// Cached variables
let lastMessageTime = 0;
let lastRunTime = 0;
let sessions = {};

const parser = new AvailabilityParser();
const bot = new Slimbot(BOT_TOKEN);

async function main() {
	try {
		const now = new Date();
		const month = now.getUTCMonth();
		const year = now.getUTCFullYear();

		await retrieveCache();

		let sentAvailableMessage = false;

		for (const embassyCode in EMBASSIES) {
			let sentMessageForEmbassy = null;
			let sentMessageForEmbassyText = '';

			const embassyName = EMBASSIES[embassyCode];

			debug(`Checking at ${embassyName} branch...`);

			for (let i = 0; i < MONTHS_SEARCH_COUNT; ++i) {
				const m = (month + i) % 12;
				const y = year + Math.floor((month + i) / 12);
				const monthName = MONTHS[m];

				debug(`Requesting HTML for ${monthName}`);
				const monthHtml = await getMonthHtml(m, y, embassyCode);

				const { available, bookable } = parser.parseMonth(monthHtml);
				if (available) {
					debug(
						`Appointments available at ${embassyName} in ${monthName}`
					);

					if (!sentAvailableMessage) {
						await bot.sendMessage(
							CHANNEL_ID,
							'🚨 *Appointments available\\!* 🚨',
							{
								parse_mode: 'MarkdownV2',
							}
						);
						sentAvailableMessage = true;
					}
					if (!sentMessageForEmbassy) {
						sentMessageForEmbassyText = `At the *${embassyName} Branch*:\n  • _${monthName}_`;
						sentMessageForEmbassy = await bot.sendMessage(
							CHANNEL_ID,
							sentMessageForEmbassyText,
							{
								parse_mode: 'MarkdownV2',
								reply_markup: JSON.stringify({
									inline_keyboard: [
										[
											{
												text: `👉 Go to ${embassyName} Branch`,
												url: `https://evisaforms.state.gov/acs/default.asp?postcode=${embassyCode}&appcode=1`,
											},
										],
									],
								}),
							}
						);
					} else {
						const {
							result: { message_id, reply_markup },
						} = sentMessageForEmbassy;
						sentMessageForEmbassyText += `\n  • _${monthName}_`;
						sentMessageForEmbassy = await bot.editMessageText(
							CHANNEL_ID,
							message_id,
							sentMessageForEmbassyText,
							{
								parse_mode: 'MarkdownV2',
								reply_markup: JSON.stringify(reply_markup),
							}
						);
					}
				} else if (!bookable && STOP_AT_NON_BOOKABLE_MONTH === 'true') {
					debug(
						`No booking at ${embassyName} in ${monthName}. Moving on to next embassy.`
					);
					break;
				}
			}
		}

		if (sentAvailableMessage) {
			updateLastMessageTime();
		} else if (shouldUpdate()) {
			await bot.sendMessage(
				CHANNEL_ID,
				`No appointments were available in the last ${MAX_SILENCE_PERIOD_HRS} hours.`,
				{ disable_notification: true }
			);
			updateLastMessageTime();
		}
	} catch (statusText) {
		debug(`Caught error: ${statusText}`);

		if (shouldUpdate()) {
			await bot.sendMessage(
				CHANNEL_ID,
				'The appointment scheduling website is unavailable right now.',
				{ disable_notification: true }
			);
			updateLastMessageTime();
		}
	} finally {
		updateLastRunTime();

		await getCacheHandler(MODE).updateCache({
			lastMessageTime,
			lastRunTime,
			sessions,
		});

		debug('Done.');
	}
}

async function getMonthHtml(month, year, embassyCode) {
	if (sessions[embassyCode]) {
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
	return await requestMonthHtml(
		sessions[embassyCode],
		month,
		year,
		embassyCode
	);
}

async function retrieveCache() {
	if (lastRunTime === 0) {
		debug('Need to fetch cache');
		const cache = await getCacheHandler(MODE).getCache();
		if (cache) {
			lastMessageTime = cache.lastMessageTime;
			lastRunTime = cache.lastRunTime;
			sessions = cache.sessions;
		}
	}
}

function shouldUpdate() {
	const now = Date.now();
	if (now - lastRunTime >= ONE_HOUR) {
		updateLastMessageTime(); // reset this since the gap was due to scheduling
	} else if (now - lastMessageTime >= MAX_SILENCE_PERIOD) {
		debug('Max silence period has elapsed');
		return true;
	}
	return false;
}

function updateLastMessageTime() {
	lastMessageTime = Date.now();
}

function updateLastRunTime() {
	lastRunTime = Date.now();
}

module.exports = { main };
