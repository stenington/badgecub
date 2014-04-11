var knox = require('knox');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var config = require('./config');

const DEBUG = config('DEBUG', false);
const UPLOAD = !DEBUG || config('DEBUG_ENABLE_UPLOAD', false);

module.exports = function Uploader (opts) {
  var client = knox.createClient(opts);
  var basePath = opts.basePath || '';

  this.put = function (badge) {

    if (!UPLOAD) {
      return new Promise(function (resolve) {
        console.log('⬆');
        console.log('JSON to %s and image to %s', badge.url, badge.imageUrl);
        resolve();
      });
    }

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
      fs.stat(badge.imagePath, function (err, stats) {
        if (err) return reject(err);
        var imgStream = fs.createReadStream(badge.imagePath);
        client.putStream(imgStream, badge.imageUrl, {
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
