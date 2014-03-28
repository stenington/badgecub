var express = require('express');
var nunjucks = require('nunjucks');
var path = require('path');
var config = require('config-store')(path.join(__dirname, './config.json'));
var fs = require('fs');
var Promise = require('bluebird');
var Uploader = require('./lib/uploader');
var Emailer = require('./lib/emailer');
var Badge = require('./lib/badge');
var debug = require('./lib/debug');

function DataURI (path) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, function (err, data) {
      if (err) return reject(err);
      else return resolve("data:image/png;base64," + data.toString('base64'));
    });
  });
}

const PORT = config('PORT', 3001);
const PRIVATE_KEY = fs.readFileSync(config('PRIVATE_KEY', './rsa-private.pem'));
const ISSUER_URL = config('ISSUER_URL');
const MANDRILL_KEY = config('MANDRILL_KEY');
const AWS_CREDENTIALS = {
  key: config('AWS_KEY'),
  secret: config('AWS_SECRET'),
  bucket: config('AWS_BUCKET')
};
const DEBUG = config('DEBUG', false);

var bodyTpl = nunjucks.compile(fs.readFileSync(path.join(__dirname, './templates/mail.html')).toString());
var uploader = new Uploader(AWS_CREDENTIALS);
var emailer = new Emailer({
  key: MANDRILL_KEY,
  template: bodyTpl,
  subject: config('EMAIL_SUBJECT'),
  from: {
    name: config('EMAIL_FROM_NAME'),
    email: config('EMAIL_FROM_EMAIL')
  },
  serviceUrl: config('SERVICE_URL', 'http://localhost:' + PORT)
});

var app = express();

var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('templates'));
env.express(app);

app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use('/static', express.static(path.join(__dirname, '/static')));

function isAction (action) {
  return function (req, res, next) {
    if (req.body.action && req.body.action === action) next();
    else next('route');
  };
}

function checkData (req, res, next) {
  var name = req.body.name;
  var desc = req.body.desc;
  var imgFile = req.files.badgeImg;
  var imgPath = req.body.filePath;
  var recipient = req.body.recipient;
  debug('Posted data', name, desc, recipient, imgFile);

  if (!(name && desc && recipient)) return res.send(500, "Missing parameter");
  if (!(imgFile || imgPath)) return res.send(500, "No image");
  if (!imgPath && imgFile.size === 0) return res.send(500, "File size 0");

  next();
}

app.get('/', function (req, res, next) {
  return res.render('index.html');
});

app.post('/', [isAction('preview'), checkData], function (req, res, next) {
  var badge = new Badge({
    name: req.body.name, 
    description: req.body.desc, 
    imagePath: req.files.badgeImg.path,
    issuerUrl: ISSUER_URL
  });
  var dataUri = new DataURI(req.files.badgeImg.path);
  dataUri.then(function (dataUri) {
    return res.render('preview.html', {
      imgSrc: dataUri,
      badge: badge,
      passthrough: {
        name: req.body.name,
        description: req.body.desc,
        recipient: req.body.recipient,
        message: req.body.msg,
        filePath: req.files.badgeImg.path
      }
    });
  }).catch(function (e) {
    res.send(500, e);
  });
});

app.post('/', [isAction('issue'), checkData], function (req, res, next) {
  var imgPath = req.body.filePath || req.files.badgeImg.path;
  var recipient = req.body.recipient;
  var badge = new Badge({
    name: req.body.name, 
    description: req.body.desc, 
    imagePath: imgPath,
    issuerUrl: ISSUER_URL
  });

  debug('Start upload');
  uploader.put(badge).then(function (results) {
    debug('Make & bake badge');
    return badge.makeAssertion(recipient).sign(PRIVATE_KEY).bake();
  }).then(function (baked) {
    debug('Send email');
    return emailer.send({to: recipient, baked: baked});
  }).then(function () {
    return new DataURI(imgPath);
  }).then(function (dataUri) {
    debug('Done!');
    return res.render('sent.html', {
      dataUrl: dataUri,
      recipient: recipient
    });
  }).catch(function (e) {
    debug('Error');
    res.send(500, e);
  });
});

app.listen(PORT, function () {
  console.log('Listening on', PORT);
});