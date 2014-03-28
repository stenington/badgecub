var express = require('express');
var nunjucks = require('nunjucks');
var path = require('path');
var config = require('config-store')(path.join(__dirname, './config.json'));
var fs = require('fs');
var Uploader = require('./lib/uploader');
var Emailer = require('./lib/emailer');
var Badge = require('./lib/badge');
var debug = require('./lib/debug');

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

var uploader = new Uploader(AWS_CREDENTIALS);
var emailer = new Emailer({
  key: MANDRILL_KEY
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
  var recipient = req.body.recipient;
  debug('Posted data', name, desc, recipient, imgFile);

  if (!(name && desc && imgFile && recipient)) {
    return res.send(500, "Missing parameter");
  }
  if (imgFile.size === 0) {
    return res.send(500, "File size 0");
  }

  next();
}

app.get('/', function (req, res, next) {
  return res.render('index.html');
});
app.post('/', [isAction('preview'), checkData], function (req, res, next) {
  res.send('PREVIEW');
});
app.post('/', [isAction('issue'), checkData], function (req, res, next) {
  var recipient = req.body.recipient;
  var badge = new Badge({
    name: req.body.name, 
    description: req.body.desc, 
    image: req.files.badgeImg,
    issuerUrl: ISSUER_URL
  });

  debug('Start upload');
  uploader.put(badge).then(function (results) {
    debug('Make & bake badge');
    return badge.makeAssertion(recipient).sign(PRIVATE_KEY).bake();
  }).then(function (baked) {
    debug('Send email');
    return emailer.send({to: recipient, badge: baked});
  }).then(function () {
    fs.readFile(req.files.badgeImg.path, function (err, data) {
      if (err) return res.send(500, err);
      debug('Done!');
      var datauri = "data:image/png;base64," + data.toString('base64');
      return res.render('sent.html', {
        dataUrl: datauri,
        recipient: recipient
      });
    });
  }).catch(function (e) {
    debug('Error');
    res.send(500, e);
  });
});

app.listen(PORT, function () {
  console.log('Listening on', PORT);
});