var Promise = require('bluebird');
var jws = require('jws');
var bakery = require('openbadges-bakery');
var uuid = require('node-uuid');
var fs = require('fs');
var url = require('url');
var debug = require('./debug');
var crypto = require('crypto');

function hash(email, salt) {
  var sum = crypto.createHash('sha256');
  sum.update(email + salt);
  return 'sha256$'+ sum.digest('hex');
}

function Signature (opts) {
  var signature = this.data = jws.sign({
    header: {alg: 'rs256'},
    privateKey: opts.key,
    payload: opts.assertion
  });

  this.bake = function () {
    return new Promise(function (resolve, reject) {
      var imgStream = fs.createReadStream(opts.badge.imagePath);
      debug('Begin baking');
      bakery.bake({
        image: imgStream,
        signature: signature
      }, function (err, imageData) {
        debug('Baking complete');
        if (err) return reject(err);
        return resolve({
          signature: signature,
          imageData: imageData,
          badge: opts.badge
        });
      });
    });
  };
}

function Assertion (opts) {
  var identity = opts.identity.hashed ? hash(opts.identity.email, opts.identity.salt) : opts.identity.email;
  var assertion = this.data = {
    uid: opts.badge.id,
    recipient: {
      identity: identity,
      type: "email",
      hashed: opts.identity.hashed,
      salt: opts.identity.salt
    },
    badge: url.resolve(opts.badge.baseUrl, opts.badge.url),
    verify: {
      type: "signed",
      url: url.resolve(opts.badge.baseUrl, "/publickey.pem")
    },
    issuedOn: (new Date()).toISOString()
  };

  this.sign = function (key) {
    return new Signature({
      assertion: assertion,
      badge: opts.badge,
      key: key
    });
  };
}

module.exports = function Badge (opts) {
  this.id = uuid.v1();
  this.imagePath = opts.imagePath;
  this.baseUrl = opts.issuerUrl;
  var dailyPath = '/' + (new Date()).toISOString().substr(0, 10) + '/';
  this.url = url.resolve(dailyPath, this.id + ".json");
  this.imageUrl = url.resolve(dailyPath, this.id + ".png");

  var badge = this.data = {
    name: opts.name,
    description: opts.description,
    image: url.resolve(this.baseUrl, this.imageUrl),
    criteria: url.resolve(this.baseUrl, "/criteria.html"),
    issuer: url.resolve(this.baseUrl, "/issuer.json")
  }

  this.makeAssertion = function (opts) {
    return new Assertion({badge: this, identity: opts});
  };

  this.asJSON = function () {
    return JSON.stringify(badge);
  };
}
