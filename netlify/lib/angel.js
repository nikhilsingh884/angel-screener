const { authenticator } = require('otplib');

// symbol -> NSE token (verify in Angel One's OpenAPIScripMaster.json)
const STOCKS = {
  RELIANCE: '2885', SBIN: '3045', INFY: '1594', TCS: '11536', HDFCBANK: '1333',
  ICICIBANK: '4963', ITC: '1660', LT: '11483', AXISBANK: '5900',
  BHARTIARTL: '10604', KOTAKBANK: '1922', HINDUNILVR: '1394', WIPRO: '3787',
};
const BASE = 'https://apiconnect.angelone.in';
const LIVE = !!process.env.API_KEY;
let jwt = null;

const headers = () => ({
  'Content-Type': 'application/json', Accept: 'application/json',
  'X-UserType': 'USER', 'X-SourceID': 'WEB',
  'X-ClientLocalIP': '127.0.0.1', 'X-ClientPublicIP': '127.0.0.1',
  'X-MACAddress': '00:00:00:00:00:00', 'X-PrivateKey': process.env.API_KEY,
  ...(jwt && { Authorization: `Bearer ${jwt}` }),
});

async function login() {
  const r = await fetch(`${BASE}/rest/auth/angelbroking/user/v1/loginByPassword`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({
      clientcode: process.env.CLIENT_CODE, password: process.env.PIN,
      totp: authenticator.generate(process.env.TOTP_SECRET),
    }),
  });
  const j = await r.json();
  if (!j.data) throw new Error(j.message || 'Angel One login failed');
  jwt = j.data.jwtToken;
}

const call = async (path, body) =>
  (await fetch(BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body) })).json();

// POST to an Angel One endpoint; logs in first, and again if the token expired
async function post(path, body) {
  if (!jwt) await login();
  let j = await call(path, body);
  if (!j.status && /token|session|invalid/i.test(JSON.stringify(j))) {
    await login();
    j = await call(path, body);
  }
  return j;
}

module.exports = { STOCKS, LIVE, post };
