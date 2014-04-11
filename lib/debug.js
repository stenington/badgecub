var path = require('path');
var config = require('./config');

module.exports = function debug () {
  if (config('DEBUG', false)) console.log.apply(null, arguments);
}
