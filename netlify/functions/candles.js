const { STOCKS, LIVE, post } = require('../lib/angel');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ist = ms => new Date(ms + 19800000).toISOString().slice(0, 16).replace('T', ' ');
// how many calendar days of history to fetch (enough for the 20-bar average)
const DAYS = { FIVE_MINUTE: 4, FIFTEEN_MINUTE: 6, THIRTY_MINUTE: 12, ONE_HOUR: 20, ONE_DAY: 150 };
const cache = {};

const reply = (code, obj, cdn) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=30',
    ...(cdn && { 'Netlify-CDN-Cache-Control': 'public, max-age=60' }),
  },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  const { interval = 'FIFTEEN_MINUTE', symbols = '' } = event.queryStringParameters || {};
  if (!LIVE) return reply(200, { live: false });
  if (!DAYS[interval]) return reply(400, { error: 'Bad interval' });

  const now = Date.now(), candles = {}, failed = [];
  const fromdate = ist(now - DAYS[interval] * 86400000).slice(0, 10) + ' 09:15';
  try {
    for (const s of symbols.split(',').slice(0, 4)) { // 4 stocks per call keeps us inside Angel One's rate limit
      if (!STOCKS[s]) continue;
      const key = `${s}|${interval}`, hit = cache[key];
      if (hit && now - hit.t < 45000) { candles[s] = hit.d; continue; }
      const j = await post('/rest/secure/angelbroking/historical/v1/getCandleData', {
        exchange: 'NSE', symboltoken: STOCKS[s], interval, fromdate, todate: ist(now),
      });
      if (j.status && Array.isArray(j.data)) { cache[key] = { t: now, d: j.data }; candles[s] = j.data; }
      else failed.push(s);
      await sleep(400);
    }
    return reply(200, { live: true, candles, failed }, failed.length === 0);
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
