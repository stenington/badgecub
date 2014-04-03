var mandrill = require('mandrill-api/mandrill');
var fs = require('fs');
var path = require('path');
var config = require('config-store')(path.join(__dirname, '../config.json'));
var Promise = require('bluebird');

const DEBUG = config('DEBUG', false);

module.exports = function Emailer (opts) {
  const SEND = (!DEBUG && !opts.test) || config('DEBUG_ENABLE_SEND', false);

  var client = opts.key ? new mandrill.Mandrill(opts.key) : undefined;

  this.send = function (args) {
    var msg = {
      "html": opts.template.render({
        imgSrc: "cid:BADGE",
        serviceUrl: opts.serviceUrl,
        badge: args.baked.badge,
        message: args.message
      }),
      "subject": opts.subject,
      "to": [{
        email: args.to,
        type: "to"
      }],
      "from_email": opts.from.email,
      "from_name": opts.from.name,
      "images": [{
        "type": 'image/png',
        "name": "BADGE",
        "content": args.baked.imageData.toString('base64')
      }]
    };

    if (SEND) {
      return new Promise(function (resolve, reject) {
        client.messages.send({
          message: msg,
          async: false
        }, function (results) {
          var result = results[0];
          if (result.status === 'rejected') return reject('Email rejected: ' + result.reject_reason);
          else if (result.status === 'invalid') return reject('Email invalid: ' + args.to);
          resolve(result);
        }, reject);
      });
    }
    else {
      return new Promise(function (resolve) {
        if (DEBUG) {
          console.log("✉");
          console.log(msg);
        }
        resolve(msg);
      });
    }
  };
}
