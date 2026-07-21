const crypto = require('crypto');
const fs = require('fs');

const keysPath = 'C:\\\\Projects\\\\ApponextHRMS\\\\server\\\\keys';

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Write keys
fs.writeFileSync(keysPath + '\\\\private.key', privateKey);
fs.writeFileSync(keysPath + '\\\\public.key', publicKey);
console.log('Keys generated successfully');
