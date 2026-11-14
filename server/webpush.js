// Envoi de notifications Web Push sans dépendance (RFC 8291 « aes128gcm » + VAPID RFC 8292).
const crypto = require('crypto');

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function fromB64u(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function generateVapidKeys() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

function vapidPrivateKeyObject(vapid) {
  const pub = fromB64u(vapid.publicKey);
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: vapid.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: 'jwk'
  });
}

function vapidJwt(audience, subject, vapid) {
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64u(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const unsigned = `${header}.${payload}`;
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key: vapidPrivateKeyObject(vapid), dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${b64u(sig)}`;
}

const hkdf = (salt, ikm, info, len) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));

// Chiffre le message pour un abonnement (clés p256dh + auth fournies par le navigateur)
function encryptPayload(payload, subscription) {
  const uaPublic = fromB64u(subscription.keys.p256dh);
  const authSecret = fromB64u(subscription.keys.auth);
  const as = crypto.createECDH('prime256v1');
  as.generateKeys();
  const asPublic = as.getPublicKey();
  const shared = as.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);
  const ikm = hkdf(authSecret, shared, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

// Envoie un message ; renvoie le code HTTP du service de push (201 = ok, 404/410 = abonnement mort)
async function sendNotification(subscription, data, vapid, subject) {
  const endpoint = new URL(subscription.endpoint);
  const jwt = vapidJwt(endpoint.origin, subject, vapid);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '43200',
      Urgency: 'normal',
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`
    },
    body: encryptPayload(JSON.stringify(data), subscription)
  });
  return res.status;
}

module.exports = { generateVapidKeys, vapidJwt, encryptPayload, sendNotification, b64u, fromB64u };
