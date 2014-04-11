var should = require('should');
var Emailer = require('../lib/emailer');

describe('emailer', function () {
  it('should compose a mandrill message', function (done) {
    var e = new Emailer({
      test: true, // <------## notice the test flag
      template: {render: function (context) {
        return "HTML";
      }},
      subject: "test",
      serviceUrl: "http://example.org/service"
    });

    var fakeBaked = {
      badge: 'XXX',
      imageData: 'YYY'
    };
    var p = e.send({
      to: "someone@example.org", 
      from: {
        name: 'test',
        email: 'test@example.org'
      },
      message: 'hi',
      baked: fakeBaked
    });
    p.then(function (msg) {
      msg.to[0].email.should.equal("someone@example.org");
      msg['from_name'].should.equal('test');
      msg['from_email'].should.equal('test@example.org');
      msg.subject.should.equal('test');
      msg.images.length.should.equal(1);
      msg.html.should.equal('HTML');
      done();
    });
  });

  it('should get absolute urls from static() template helper', function (done) {
    var fakeTemplate = {
      render: function (context) {
        this.context = context;
      }
    };
    var e = new Emailer({
      test: true,
      template: fakeTemplate,
      subject: 'test',
      serviceUrl: 'http://example.org/',
      staticUrl: 'http://example.org/some/url/'
    });

    var p = e.send({
      to: "someone@example.org", 
      from: {
        name: 'test',
        email: 'test@example.org'
      },
      message: 'hi',
      baked: {
        badge: 'XXX',
        imageData: 'YYY'
      }
    });

    p.then(function (msg) {
      fakeTemplate.context.static('/foo.png').should.equal('http://example.org/some/url/foo.png');
      done();
    });
  });
});
