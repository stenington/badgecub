var should = require('should');
var Emailer = require('../lib/emailer');

describe('emailer', function () {
  it('should compose a mandrill message', function (done) {
    var e = new Emailer({
      test: true,
      template: {render: function (context) {
        return "HTML";
      }},
      subject: "test",
      from: {
        name: 'test',
        email: 'test@example.org'
      },
      serviceUrl: "http://example.org/service"
    });

    var fakeBaked = {
      badge: 'XXX',
      imageData: 'YYY'
    };
    var p = e.send({to: "someone@example.org", baked: fakeBaked});
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
});
