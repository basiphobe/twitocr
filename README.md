# twitocr

A node app for Twitter that performs OCR on an image (sent via Direct Message with a specific hashtag), and returns the text to the sender (again, via Direct Message).

The app has three distinct roles:

1. Webhooks server for monitoring Account Activity API
2. Direct Message receiver/OCR processor
3. Direct Message responder

## Requirements

   * Twitter API:
     * https://apps.twitter.com
       * Create an app
         * Provide a valid Callback URL (**which will point to a running instance of this app**).
         * Ensure "Read, Write and Access direct messages" permissions are enabled.
       * Make note of the Consumer Key, Consumer Secret, Access Token, and Access Token Secret values.
   * Free OCR API:
     * https://ocr.space/ocrapi
       * Register for a free API key

## Install

    $ git clone https://github.com/basiphobe/twitocr.git
    $ cd twitocr
    $ npm install

## Config

Modify `config.js`, replacing the temporary values ('xxxxxxx...') with the respective Twitter and OCR API key values:

```
consumer_key: 'xxxxxxxxxxxxxxxxxxxxxxxx',
consumer_secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
access_token_key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
access_token_secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
ocr_apikey: 'xxxxxxxxxxxxxxxxx',
```

You may also choose to modify the port that the app runs on, and well as the hashtag used to trigger the ocr functionality.

```
server_port: 7000,
...
ocrHashTag: 'ocrme'
```

## Running Locally

Use your favorite process manager to start `server.js`. For example:

    $ pm2 start server.js
    
## Usage

Send your **@handle** a direct message containing either a URL to an image (or an image file), and the hashtag specified in `config.js` (**#ocrme** by default). You should receive a response in the same message thread.

For example:

The direct message (_the order of the image/url and hashtag is not important_):
```
https://i.imgur.com/leN5MZB.png #ocrme
```

The response:

```
Here you go: 
"I've learned that you can tell a lot about a 
person by the way (s)he handles these three 
things: a rainy day, lost luggage, and tangled 
Christmas tree lights. " 
Maya Angelou (via feallng) 

Thanks for using #ocrme!
```



