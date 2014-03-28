# Badgecub

## Config

Specify in the environment:

* Mandatory:
    * `ISSUER_URL`: http://full-url.org
    * `MANDRILL_KEY`: Mandrill API key
    * `AWS_KEY`: AWS key
    * `AWS_SECRET`: AWS secret
    * `AWS_BUCKET`: AWS bucket
    * `EMAIL_SUBJECT`: Subject of badge award emails
    * `EMAIL_FROM_NAME`: Sender name on badge award emails
    * `EMAIL_FROM_EMAIL`: Sender return address on badge award emails
* Optional:
    * `PRIVATE_KEY`: Path to private key .pem, default: `./rsa-private.pem`
    * `PORT`: Port to use, default: 3001
    * `SERVICE_URL`: Url to use for linking back to the app, default: http://localhost:<PORT>
    * `DEBUG`: Turn debug on, default: false

or write a `./config.json` file with similar keys, like:

``` json
{
  "port": 3002,
  "privateKey": "path/to/private_key.pem",
  "issuer": {
    "url": "http://full-url.org",
  },
  "mandrill": {
    "key": "<KEY>",
  },
  "aws": {
    "key": "<KEY>",
    "secret": "<SHHHH>",
    "bucket": "my_bucket"
  },
  "email": {
    "subject": "Hi",
    "from": {
      "name": "me",
      "email": "me@example.org"
    }
  }
}
```


