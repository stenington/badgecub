# Badgecub

## Config

Specify in the environment:

* Mandatory:
    * `ISSUER_NAME`: Your site name
    * `ISSUER_URL`: Base url of your issuer site
    * `MANDRILL_KEY`: Mandrill API key
    * `AWS_KEY`: AWS key
    * `AWS_SECRET`: AWS secret
    * `AWS_BUCKET`: AWS bucket
    * `EMAIL_SUBJECT`: Subject of badge award emails
* Optional:
    * `PORT`: Port to use, default: 3001
    * `STATIC_ASSET_URL`: If set, this url will be prepended to all static asset paths
    * `AWS_PATH`: A base path to use within the bucket, default: `/`
    * `PRIVATE_KEY`: Your private key, defaults to reading from `PRIVATE_KEY_FILE`
    * `PRIVATE_KEY_FILE`: Path to private key .pem, default: `./rsa-private.pem`
    * `ASSERTION_SALT`: Salt to use when hashing email addresses, default: undefined
    * `ASSERTION_EXPIRES`: Number of days after which an assertion expires, default: no expiration
    * `DEBUG`: Turn debug on, default: false

or write a `./config.json` file with similar keys, like:

``` json
{
  "port": 3002,
  "privateKey": "path/to/private_key.pem",
  "issuer": {
    "name": "My Org Name Or Whatever",
    "url": "http://full-url.org",
  },
  "mandrill": {
    "key": "<KEY>",
  },
  "aws": {
    "key": "<KEY>",
    "secret": "<SHHHH>",
    "bucket": "my_bucket",
    "path": "my/path/"
  },
  "email": {
    "subject": "Hi"
  },
  "assertion": {
    "salt": "salty",
    "expires": 30
  }
}
```

## Data Cleanup

Write a [lifecycle rule](http://docs.aws.amazon.com/AmazonS3/latest/dev/manage-lifecycle-using-console.html) on your S3 bucket to
expire or transition the data under your `AWS_PATH` directory after `ASSERTION_EXPIRES` days.
