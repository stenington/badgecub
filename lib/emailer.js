var mandrill = require('mandrill-api/mandrill');
var nunjucks = require('nunjucks');
var fs = require('fs');
var path = require('path');
var config = require('config-store')(path.join(__dirname, '../config.json'));
var Promise = require('bluebird');

const DEBUG = config('DEBUG', false);
const SEND = !DEBUG || config('DEBUG_ENABLE_SEND', false);

module.exports = function Emailer (opts) {

  var client = new mandrill.Mandrill(opts.key);
  var body = nunjucks.compile(fs.readFileSync(path.join(__dirname, '../templates/mail.html')).toString());

  this.send = function (opts) {
    var msg = {
      "html": body.render({
        imgSrc: "cid:BADGE",
        serviceUrl: "#",
        badge: opts.baked.badge
      }),
      "subject": "Badgecub Test",
      "to": [{
        email: opts.to,
        type: "to"
      }],
      "from_email": "mikelarssonftw@gmail.com",
      "from_name": "Mandrill but kinda Mike",
      "images": [{
        "type": 'image/png',
        //"name": imgRes.headers['x-file-name'],
        "name": "BADGE",
        "content": opts.baked.imageData.toString('base64')
      }]
    };

    if (SEND) {
      return new Promise(function (resolve, reject) {
        client.messages.send({
          message: msg,
          async: false
        }, resolve, reject);
      });
    }
    else {
      return new Promise(function (resolve) {
        console.log("✉");
        console.log(msg);
        resolve();
      });
    }
  };
}
