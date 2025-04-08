
const { AES, enc,format, mode, pad } = require('crypto-js');
const Base64 = require('crypto-js/enc-base64');

function decryptEas(data, key, iv) {
  const keys = Base64.parse(key);
  const ivs = Base64.parse(iv);
  // convert to binary data
  return AES.decrypt(data, keys, {
    iv: ivs,
    mode: mode.CBC,
    padding: pad.Pkcs7,
    format: format.Hex,
  }).toString(enc.Utf8);
}

// export default decryptEas;
module.exports={decryptEas};


// aes(advanced encryption standerd)

// data (the encrypted information), key (the decryption key), and iv (the initialization vector).
// The result is converted to a UTF-8 string using .toString(enc.Utf8) and is then returned from the function.