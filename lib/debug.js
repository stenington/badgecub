var path = require('path');
var config = require('config-store')(path.join(__dirname, '../config.json'));

module.exports = function debug () {
  if (config('DEBUG', false)) console.log.apply(null, arguments);
}
