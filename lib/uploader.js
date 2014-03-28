var knox = require('knox');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');

module.exports = function Uploader (opts) {
  var client = knox.createClient(opts);
  var basePath = opts.basePath || '';

  this.put = function (badge) {
    var dailyPath = (new Date()).toISOString().substr(0, 10);
    var badgeUpload = new Promise(function (resolve, reject) {
      var json = badge.asJSON();
      var req = client.put(path.join(basePath, dailyPath, badge.url), {
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
      fs.stat(badge.imagePath, function (err, stats) {
        if (err) return reject(err);
        var imgStream = fs.createReadStream(badge.imagePath);
        client.putStream(imgStream, path.join(basePath, dailyPath, badge.imageUrl), {
          'Content-Length': stats.size,
          'Content-Type': 'image/png',
          'x-amz-acl': 'public-read'
        }, function (err, res) {
          if (200 === res.statusCode) return resolve();
          else if (err) return reject(err);
          else return reject(res.statusCode);
        });
      });
    });
    return Promise.all([badgeUpload, imageUpload]);
  };
}
