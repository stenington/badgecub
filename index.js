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
var Form = require('./lib/forms').Form;

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

function prepForm (opts) {
  opts = opts || {};

  return function (req, res, next) {
    var form = req.form = new Form([
      {
        name: 'badgeImage',
        label: 'Image',
        type: 'file',
        attrs: {
          accept: 'image.png'
        },
        required: true
      },
      {
        name: 'name',
        label: 'Title',
        type: 'text',
        attrs: {
          placeholder: 'Make it fun, add a pun.'
        },
        required: true
      },
      {
        name: 'desc',
        label: 'Description',
        type: 'text',
        attrs: {
          placeholder: 'Keep it short and sweet. Fit it in a tweet.'
        },
        required: true
      },
      {
        name: 'recipient',
        label: 'Recipient\'s email',
        type: 'text',
        attrs: {
          placeholder: 'Double check it, don\'t regret it.'
        },
        required: true
      },
      {
        name: 'msg',
        label: 'Message',
        type: 'textarea',
        attrs: {
          placeholder: 'Tell your badger why they deserve this masterpiece of a badge. If you have a link that proves it, add that in the mix too.'
        }
      }
    ]);

    if (opts.validate && !form.validate(req)) {
      return res.render('index.html', {
        formFields: form.templateData()
      });
    }

    next();
  };
}

app.get('/', [prepForm()], function (req, res, next) {
  return res.render('index.html', {
    formFields: req.form.templateData() 
  });
});

app.post('/', [isAction('preview'), prepForm({validate: true})], function (req, res, next) {
  var form = req.form;
  var data = form.formData();
  var badge = new Badge({
    name: data.name,
    description: data.desc,
    imagePath: data.badgeImage,
    issuerUrl: ISSUER_URL
  });
  var dataUri = new DataURI(data.badgeImage);
  dataUri.then(function (dataUri) {
    return res.render('preview.html', {
      imgSrc: dataUri,
      badge: badge,
      message: data.msg,
      passthrough: form.templateData()
    });
  }).catch(function (e) {
    res.send(500, e);
  });
});

app.post('/', [isAction('issue'), prepForm({validate: true})], function (req, res, next) {
  var form = req.form;
  var data = form.formData();
  var badge = new Badge({
    name: data.name,
    description: data.desc,
    imagePath: data.badgeImage,
    issuerUrl: ISSUER_URL
  });

  debug('Start upload');
  uploader.put(badge).then(function (results) {
    debug('Make & bake badge');
    return badge.makeAssertion({
      email: data.recipient,
      hashed: true,
      salt: config('ASSERTION_SALT', undefined)
    }).sign(PRIVATE_KEY).bake();
  }).then(function (baked) {
    debug('Send email');
    return emailer.send({to: data.recipient, message: data.msg, baked: baked});
  }).then(function () {
    return new DataURI(data.badgeImage);
  }).then(function (dataUri) {
    debug('Done!');
    return res.render('sent.html', {
      dataUrl: dataUri,
      recipient: data.recipient
    });
  }).catch(function (e) {
    debug('Error');
    res.send(500, e);
  });
});

app.listen(PORT, function () {
  console.log('Listening on', PORT);
});