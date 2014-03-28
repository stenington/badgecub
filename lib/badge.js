var Promise = require('bluebird');
var jws = require('jws');
var bakery = require('openbadges-bakery');
var uuid = require('node-uuid');
var fs = require('fs');
var url = require('url');
var debug = require('./debug');

function Signature (opts) {
  var signature = jws.sign({
    header: {alg: 'rs256'},
    privateKey: opts.key,
    payload: opts.assertion
  });

  this.bake = function () {
    return new Promise(function (resolve, reject) {
      var imgStream = fs.createReadStream(opts.imagePath);
      debug('Begin baking');
      bakery.bake({
        image: imgStream,
        signature: signature
      }, function (err, imageData) {
        debug('Baking complete');
        if (err) return reject(err);
        return resolve({
          contents: signature,
          imageData: imageData
        });
      });
    });
  };
}

function Assertion (opts) {
  var assertion = {
    uid: opts.badge.id,
    recipient: {
      identity: opts.email,
      type: "email",
      hashed: false
    },
    badge: url.resolve(opts.badge.baseUrl, opts.badge.url),
    verify: {
      type: "signed",
      url: url.resolve(opts.badge.baseUrl, "/publickey.pem")
    },
    issuedOn: (new Date()).toISOString()
  };

  this.sign = function (key) {
    return new Signature({assertion: assertion, imagePath: opts.badge.imagePath, key: key});
  };
}

module.exports = function Badge (opts) {
  this.id = uuid.v1();
  this.imagePath = opts.imagePath;
  this.baseUrl = opts.issuerUrl;
  this.url = "/" + this.id + ".json";
  this.imageUrl = "/" + this.id + ".png";

  var badge = {
    name: opts.name,
    description: opts.description,
    image: url.resolve(this.baseUrl, this.imageUrl),
    criteria: url.resolve(this.baseUrl, "/criteria.html"),
    issuer: url.resolve(this.baseUrl, "/issuer.json")
  }

  this.makeAssertion = function (email) {
    return new Assertion({badge: this, email: email}); 
  };

  this.asJSON = function () {
    return JSON.stringify(badge);
  };
}
