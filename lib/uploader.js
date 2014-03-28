var knox = require('knox');
var Promise = require('bluebird');
var fs = require('fs');

module.exports = function Uploader (opts) {
  var client = knox.createClient(opts);

  this.put = function (badge) {
    var badgeUpload = new Promise(function (resolve, reject) {
      var json = badge.asJSON();
      var req = client.put(badge.url, {
        'Content-Length': json.length,
        'Content-Type': 'application/json',
        'x-amz-acl': 'public-read'
      });
      req.on('response', function (res) {
        if (200 === res.statusCode) return resolve();
        else return reject(res.statusCode);
      });
      req.on('error', function (err) {
        return reject(err);
      });
      req.end(json);
    });
    var imageUpload = new Promise(function (resolve, reject) {
      var imgStream = fs.createReadStream(badge.image.path);
      client.putStream(imgStream, badge.imageUrl, {
        'Content-Length': badge.image.size,
        'Content-Type': badge.image.type,
        'x-amz-acl': 'public-read'
      }, function (err, res) {
        if (200 === res.statusCode) return resolve();
        else if (err) return reject(err);
        else return reject(res.statusCode);
      });
    });
    return Promise.all([badgeUpload, imageUpload]);
  };
}
