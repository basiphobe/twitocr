/**
 * @file Direct Message/OCR Processor
 */

'use strict';

const request = require('request');
const crypto = require('crypto');
const security = require('./security');
const config = require('../config');
const ocr = require('ocr-space-api');
const fs = require('fs');
const tmp = require('tmp');
const strings = require('../strings');

/**
 * Main function for receiving and responding to direct messages.
 * @name twitocr
 * @return {object} module
 */
function twitocr() {
    let directMessage = null;
    let directMessageData = null;
    let tweetMessage = null;
    let userid = null;
    let attachmentUrl = null;

    /**
     * Initialize function variables.
     * @name init
     * @param {Object} payload - payload data obtained from a post event
     * @property {Array} direct_message_events
     * @property (Array) tweet_create_events
     * @property {string} sender_id
     */
    function init(payload) {
        try {
            // Only use the first direct message, even if there are multiple.
            directMessage = (payload.direct_message_events && payload.direct_message_events.length > 0) ? payload.direct_message_events[0] : null;
            directMessageData = (directMessage) ? directMessage.message_create.message_data : null;
            tweetMessage = (payload.tweet_create_events && payload.tweet_create_events.length > 0) ? payload.tweet_create_events[0] : null;
            userid = (directMessage) ? directMessage.message_create.sender_id : ((tweetMessage) ? tweetMessage.user.id : null);
            attachmentUrl = getAttachmentUrl();
        } catch (e) {
            // Payload error, probably
        }
    }

    /**
     * Determines if the payload contained a direct message object.
     * @name isDirectMessage
     * @returns {boolean}
     */
    function isDirectMessage() {
        return (directMessage);
    }

    /**
     * Determines if the payload contained a tweet object.
     * @name isTweet
     * @returns {boolean}
     */
    function isTweet() {
        return (tweetMessage);
    }

    /**
     * Determines if the payload contains a specific hash tag.
     * @name hasOcrHashTag
     * @returns {boolean}
     * @property {Array} hashtags
     */
    function hasOcrHashTag() {
        let result = false;
        let hashtags = null;
        try {
            if (directMessageData) {
                hashtags = directMessageData.entities.hashtags;
            } else if (tweetMessage) {
                hashtags = tweetMessage.entities.hashtags;
            }
        } catch (e) {
            // Payload error, probably
        }

        if (hashtags) {
            for (let i = 0; i < hashtags.length; i++) {
                if (hashtags[i].text.indexOf(config.ocrHashTag) >= 0) {
                    result = true;
                    break;
                }
            }
        }
        return result;
    }

    /**
     * Obtains the attachment url from the payload
     * @name getAttachmentUrl
     * @returns {string}
     * @property {string} media_url
     * @property {string} expanded_url
     */
    function getAttachmentUrl() {
        let url = "";
        if (isDirectMessage()) {
            try {
                url = directMessageData.attachment.media.media_url;
            } catch (e) {
                // Either no image file was included, or there was a payload error
            }

            if (!url) {
                // See if there are any URLs to process
                try {
                    if (directMessageData.entities.urls && Object.keys(directMessageData.entities.urls).length) {
                        // Only deal with one right now
                        url = directMessageData.entities.urls[0].expanded_url;
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        } else if (isTweet()) {
            try {
                if (tweetMessage.entities.urls && Object.keys(tweetMessage.entities.urls).length) {
                    // Only deal with one right now
                    url = tweetMessage.entities.urls[0].expanded_url;
                }
            } catch (e) {
                console.log(e);
            }
        }

        return url;
    }

    /**
     * Determines whether the payload contains an attachment object
     * @name hasAttachment
     * @returns {boolean}
     */
    function hasAttachment() {
        return (attachmentUrl);
    }

    /**
     * Creates the payload that will be sent through the direct message response
     * @name createDirectMessageData
     * @param {string} str
     * @returns {object}
     */
    function createDirectMessageData(str) {
        return {
            event : {
                type: 'message_create',
                message_create : {
                    target: {
                        recipient_id : userid
                    },
                    message_data : {
                        text : str
                    }
                }

            }
        };
    }

    /**
     * Creates the payload that will be sent as a tweet reply
     * @name createTweetData
     * @param {string} str
     * @returns {object}
     */
    function createTweetData(str) {
        return '@' + tweetMessage.user.screen_name + ' ' + sanitizeText(str);
    }

    /**
     * Generates the authorization string for sending direct messages.
     * @name generateOAuth
     * @param {string} postUrl
     * @returns {string}
     */
    function generateOAuth(postUrl, postData) {
        const oauth_consumer_key = config.consumer_key;
        const oauth_nonce = crypto.randomBytes(32).toString('base64').replace(/\W/g, '');
        const oauth_signature_method = 'HMAC-SHA1';
        const oauth_timestamp = Math.floor(Date.now() / 1000);
        const oauth_version = '1.0';
        const oauth_token = config.access_token_key;
        const oauth_request_method = 'POST';
        const oauth_base_url = postUrl;

        const oauth_parameters = new Map();
        if (postData) {
            oauth_parameters.set('in_reply_to_status_id', tweetMessage.id_str);
        }
        oauth_parameters.set('oauth_consumer_key', oauth_consumer_key);
        oauth_parameters.set('oauth_nonce', oauth_nonce);
        oauth_parameters.set('oauth_signature_method', oauth_signature_method);
        oauth_parameters.set('oauth_timestamp', oauth_timestamp);
        oauth_parameters.set('oauth_token', oauth_token);
        oauth_parameters.set('oauth_version', '1.0');
        if (postData) {
            oauth_parameters.set('status', postData);
        }
        if (postData) {
            oauth_parameters.set('tweet_mode', 'extended');
        }

        const oauth_signature_base = buildBaseString(oauth_request_method, oauth_base_url, oauth_parameters);
        const oauth_signing_key = encodeURIComponent(config.consumer_secret) + '&' + encodeURIComponent(config.access_token_secret);
        const oauth_signature = security.hmac_sha1(oauth_signature_base, oauth_signing_key);

        return 'OAuth ' +
            encodeURIComponent('oauth_consumer_key') + '="' + encodeURIComponent(oauth_consumer_key) + '",' +
            encodeURIComponent('oauth_token') + '="' + encodeURIComponent(oauth_token) + '",' +
            encodeURIComponent('oauth_signature_method') + '="' + encodeURIComponent(oauth_signature_method) + '",' +
            encodeURIComponent('oauth_timestamp') + '="' + encodeURIComponent(oauth_timestamp.toString()) + '",' +
            encodeURIComponent('oauth_nonce') + '="' + encodeURIComponent(oauth_nonce) + '",' +
            encodeURIComponent('oauth_version') + '="' + encodeURIComponent(oauth_version) + '",' +
            encodeURIComponent('oauth_signature') + '="' + encodeURIComponent(oauth_signature) + '"';
    }

    /**
     * Builds an OAuth base signature string
     * @param {string} method
     * @param {string} baseUrl
     * @param {Map} params
     * @returns {string}
     */
    function buildBaseString(method, baseUrl, params) {
        let paramArray = [];
        params.forEach((val,key) => {
            paramArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
        });
        return method.toUpperCase() + '&' + encodeURIComponent(baseUrl) + '&' + encodeURIComponent(paramArray.join('&'));
    }

    /**
     * Sends a direct message
     * @param {string} str
     */
    function sendDirectMessage(str) {
        const postUrl = "".concat(config.twitterAPIHost, '/direct_messages/events/new.json');
        const postData = createDirectMessageData(str);
        const oauth = generateOAuth(postUrl, null);
        const options = {
            method: 'post',
            body: postData,
            json: true,
            url: postUrl,
            headers: {
                Authorization: oauth,
                'Content-Type': 'application/json'
            }
        };
        request(options, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    /**
     * Sends a tweeet
     * @param {string} str
     */
    function sendTweet(str) {
        const postUrl = "".concat(config.twitterAPIHost, '/statuses/update.json');
        const postData = createTweetData(str);
        const oauth = generateOAuth(postUrl, postData);
        const options = {
            method: 'post',
            body: 'status=' + encodeURIComponent(postData) + '&in_reply_to_status_id=' + tweetMessage.id_str + '&tweet_mode=extended',
            json: false,
            url: postUrl,
            headers: {
                Authorization: oauth,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        request(options, (err, res) => {
            console.log(res.body);
            if (err) {
                console.log(err);
            }
        });
    }

    /**
     * Responds to direct message sender with OCR results of attachment
     * @name ocrResponse
     */
    function ocrResponse() {
        const tmpFile = tmp.fileSync();
        const options = {
            url: attachmentUrl,
            oauth: {
                consumer_key: config.consumer_key,
                consumer_secret: config.consumer_secret,
                token: config.access_token_key,
                token_secret: config.access_token_secret
            }
        };
        request.get(options).pipe(fs.createWriteStream(tmpFile.name)).on('close', () => {
            ocr.parseImageFromLocalFile(tmpFile.name, {
                apikey: config.ocr_apikey,
                language: 'eng'
            }).then(result => {
                const ocrResponse = strings.success.replace(/%1/, result.parsedText).replace(/%2/, config.ocrHashTag);
                if (isDirectMessage()) {
                    sendDirectMessage(ocrResponse);
                } else if (isTweet()) {
                    sendTweet(ocrResponse);
                }
            }).catch(err => {
                let errMsg = strings.error_0;
                const errCode = "error_" + err.OCRExitCode;
                if (errCode in strings) {
                    errMsg = strings[errCode];
                }
                if (isDirectMessage()) {
                    sendDirectMessage(errMsg);
                } else if (isTweet()) {
                    sendTweet(errMsg);
                }
            });
        });
    }

    function sanitizeText(str) {
        return str.replace(/!/g, '%21').replace(/\*/g, '%2A').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27');
    }

    /**
     * Module exports
     */
    const module = {};
    module.init = init;
    module.isDirectMessage = isDirectMessage;
    module.isTweet= isTweet;
    module.hasOcrHashTag = hasOcrHashTag;
    module.hasAttachment = hasAttachment;
    module.ocrResponse = ocrResponse;
    return module;
}

module.exports = twitocr;