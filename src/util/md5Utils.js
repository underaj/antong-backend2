
var crypto = require('crypto');

function md5(str) {
  var md5 = crypto.createHash('md5');

  var result = md5.update(str).digest('hex').toUpperCase();

  return result;
}

module.exports.md5 = md5;
