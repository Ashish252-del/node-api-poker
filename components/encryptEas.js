const { AES, format, mode, pad } = require('crypto-js');
const Base64 = require('crypto-js/enc-base64');

function encryptEas(data, key, iv) {
  const keys = Base64.parse(key);
  const ivs = Base64.parse(iv);
  
  const encrypted = AES.encrypt(data, keys, {
    iv: ivs,
    mode: mode.CBC,
    padding: pad.Pkcs7,
    format: format.Hex,
  });

  console.log("78", encrypted.toString());
  return encrypted.toString();
}

module.exports = {encryptEas};
