const { STOCKS, LIVE, post } = require('../lib/angel');

async function liveQuotes() {
  const j = await post('/rest/secure/angelbroking/market/v1/quote/', {
    mode: 'FULL', exchangeTokens: { NSE: Object.values(STOCKS) },
  });
  if (!j.data) throw new Error(j.message || 'No quote data');
  return j.data.fetched.map(q => ({
    symbol: q.tradingSymbol.replace('-EQ', ''), ltp: q.ltp, open: q.open,
    high: q.high, low: q.low, close: q.close, pct: q.percentChange,
    volume: q.tradeVolume, buy: q.totBuyQuan, sell: q.totSellQuan,
    wkHigh: q['52WeekHighPrice'], wkLow: q['52WeekLowPrice'],
  }));
}

// Demo data (same on every server instance, changes with time)
const demo = () => Object.keys(STOCKS).map((s, i) => {
  const c = 300 + i * 217, t = Date.now() / 1000, w = x => Math.sin(t / (40 + i * 7) + i * x);
  const p = c * (1 + 0.02 * w(1)), o = c * (1 + 0.012 * Math.sin(i * 2));
  return {
    symbol: s, ltp: p, open: o, high: Math.max(p, o) * 1.004, low: Math.min(p, o) * 0.996,
    close: c, pct: (p - c) / c * 100, volume: Math.floor(1e6 * (1.5 + Math.sin(i)) + (t % 1e5)),
    buy: 1e5 * (1.2 + w(3)), sell: 1e5 * (1.2 - 0.5 * w(3)), wkHigh: c * 1.2, wkLow: c * 0.7,
  };
});

exports.handler = async () => {
  try {
    const quotes = LIVE ? await liveQuotes() : demo();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=5' },
      body: JSON.stringify({ live: LIVE, time: new Date().toISOString(), quotes }),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
