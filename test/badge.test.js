var should = require('should');
var Badge = require('../lib/badge');
var fs = require('fs');
var path = require('path');

describe('badge', function () {

  it('should have unique id', function () {
    var data = {
      name: "Test",
      description: "A test.",
      imagePath: "./some/path",
      issuerUrl: "http://example.org/some-url"
    };
    (new Badge(data)).id.should.not.equal((new Badge(data)).id);
  });

  it('should include date in upload urls', function () {
    var b = new Badge({
      name: "Test",
      description: "A test.",
      imagePath: "./some/path",
      issuerUrl: "http://example.org/some-url"
    });
    var d = (new Date()).toISOString().substr(0, 10);
    b.url.should.include(d);
    b.imageUrl.should.include(d);
  });

  it('should return badge class json', function () {
    var b = new Badge({
      name: "Test",
      description: "A test.",
      imagePath: "./some/path",
      issuerUrl: "http://example.org/some-url"
    });
    var json = b.asJSON();
    json.should.be.a.String;
    json = JSON.parse(json);
    json.should.have.keys('name', 'description', 'image', 'criteria', 'issuer');
    json.name.should.equal("Test");
    json.description.should.equal("A test.");
    json.image.should.include(b.imageUrl);
  });

  it('should return assertion', function () {
    var b = new Badge({
      name: "Test",
      description: "A test.",
      imagePath: "./some/path",
      issuerUrl: "http://example.org/some-url"
    });
    var a = b.makeAssertion("email@example.org"); 
    a.data.should.have.keys('uid', 'recipient', 'badge', 'verify', 'issuedOn');
    a.data.uid.should.equal(b.id);
    a.data.recipient.identity.should.equal("email@example.org");
    a.data.badge.should.include(b.url);
  });

  it('should return signature from assertion', function () {
    var key = fs.readFileSync(path.join(__dirname, './rsa-private.pem'));
    var b = new Badge({
      name: "Test",
      description: "A test.",
      imagePath: "./some/path",
      issuerUrl: "http://example.org/some-url"
    });
    var s = b.makeAssertion("email@example.org").sign(key); 
    s.data.should.match(/^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/);
  });

  it('should be bakeable as signature', function (done) {
    var key = fs.readFileSync(path.join(__dirname, './rsa-private.pem'));
    var b = new Badge({
      name: "Test",
      description: "A test.",
      imagePath: path.join(__dirname, "./default.png"),
      issuerUrl: "http://example.org/some-url"
    });
    var s = b.makeAssertion("email@example.org").sign(key);
    s.bake().then(function (baked) {
      s.data.should.equal(baked.signature); 
      baked.imageData.should.be.an.instanceof(Buffer);
      baked.badge.should.equal(b);
      done();
    });
  });
});