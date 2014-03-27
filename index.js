var express = require('express');
var nunjucks = require('nunjucks');
var request = require('request');
var path = require('path');
var mandrill = require('mandrill-api/mandrill');
var Promise = require('bluebird');
var jws = require('jws');
var bakery = require('openbadges-bakery');
var uuid = require('node-uuid');
var knox = require('knox');
var fs = require('fs');
var url = require('url');

const PORT = process.env.PORT || 3001;
const PRIVATE_KEY = fs.readFileSync('./rsa-private.pem');
const ISSUER_URL = "http://mlarsson.s3-website-us-east-1.amazonaws.com/";

function Uploader (opts) {
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

function Emailer (opts) {

  var client = new mandrill.Mandrill(opts.key);

  this.send = function (opts) {
    var msg = {
      "html": "<h1>Hello!</h1><p>This is a test. This badge should be baked: <img src=\"cid:BADGE\"></p><p>Try saving it, then uploading it to the Backpack.</p>",
      "subject": "TEST!",
      "to": [{
        email: "mikelarssonftw@gmail.com",
        type: "to"
      }],
      "from_email": "mikelarssonftw@gmail.com",
      "from_name": "Mandrill but kinda Mike",
      "images": [{
        "type": 'image/png',
        //"name": imgRes.headers['x-file-name'],
        "name": "BADGE",
        "content": opts.badge.imageData.toString('base64')
      }]
    };

    return new Promise(function (resolve, reject) {
      client.messages.send({
        message: msg,
        async: false
      }, resolve, reject);
    });
  };
}

function Signature (opts) {
  var signature = jws.sign({
    header: {alg: 'rs256'},
    privateKey: PRIVATE_KEY,
    payload: opts.assertion
  });

  this.bake = function () {
    return new Promise(function (resolve, reject) {
      var imgStream = fs.createReadStream(opts.image.path);
      bakery.bake({
        image: imgStream,
        signature: signature
      }, function (err, imageData) {
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
    badge: url.resolve(ISSUER_URL, opts.badge.url),
    verify: {
      type: "signed",
      url: url.resolve(ISSUER_URL, "/publickey.pem")
    },
    issuedOn: (new Date()).toISOString()
  };

  this.sign = function () {
    return new Signature({assertion: assertion, image: opts.badge.image});
  };
}

function Badge (opts) {
  this.id = uuid.v1();
  this.image = opts.image;
  this.url = "/" + this.id + ".json";
  this.imageUrl = "/" + this.id + ".png";

  var badge = {
    name: opts.name,
    descriptions: opts.description,
    image: url.resolve(ISSUER_URL, this.imageUrl),
    criteria: url.resolve(ISSUER_URL, "/criteria.html"),
    issuer: url.resolve(ISSUER_URL, "/issuer.json")
  }

  this.makeAssertion = function (email) {
    return new Assertion({badge: this, email: email}); 
  };

  this.asJSON = function () {
    return JSON.stringify(badge);
  };
}

var app = express();

app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use('/static', express.static(path.join(__dirname, '/static')));

var env = new nunjucks.Environment(new nunjucks.FileSystemLoader());
env.express(app);

var uploader = new Uploader({
  key: "AKIAJ2FZEW4UWWBKCT3Q",
  secret: "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",
  bucket: "mlarsson"
});
var emailer = new Emailer({
  key: 'wiY-RZW09O0LIUI8VItb0Q'
});

app.get('/', function (req, res, next) {
  return res.render('index.html');
});
app.post('/issue', function (req, res, next) {
  var name = req.body.name;
  var desc = req.body.desc;
  var imgFile = req.files.badgeImg;
  var recipient = req.body.recipient;

  var badge = new Badge({name: name, description: desc, image: imgFile});

  uploader.put(badge).then(function (results) {
    return badge.makeAssertion(recipient).sign().bake();
  }).then(function (baked) {
    return emailer.send({to: recipient, badge: baked});
  }).then(function () {
    res.send('ok');
  }).catch(function (e) {
    res.send(500);
  });
});

app.listen(PORT, function () {
  console.log('Listening on', PORT);
});