/**
 * @file Processes DMs for OCR
 */

'use strict';

const request = require('request');
const crypto = require('crypto');
const security = require('./security');
const config = require('../config');
const ocr = require('ocr-space-api');
const fs = require('fs');
const tmp = require('tmp');

/**
 * Main function for receiving and responding to direct messages.
 * @name twitocr
 * @return module
 */
function twitocr() {
    let directMessage = null;
    let msgData = null;
    let userid = null;
    let attachmentUrl = null;

    /**
     * Initialize function variables.
     * @name init
     * @param {string} payload - payload data obtained from a post event
     */
    function init(payload) {
        try {
            // Only use the first direct message, even if there are multiple.
            directMessage = payload.direct_message_events.length > 0 ? payload.direct_message_events[0] : null;
            msgData = directMessage ? directMessage.message_create.message_data : null;
            userid = directMessage ? directMessage.message_create.sender_id : null;
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
     * Determines if the payload contains a specific hash tag.
     * @name hasOcrHashTag
     * @returns {boolean}
     */
    function hasOcrHashTag() {
        let result = false;
        let hashtags = null;
        if (msgData) {
            try {
                hashtags = msgData.entities.hashtags;
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
        }
        return result;
    }

    /**
     * Obtains the attachment url from the payload
     * @name getAttachmentUrl
     * @returns {string}
     */
    function getAttachmentUrl() {
        let url = "";
        try {
            url = msgData.attachment.media.media_url;
        } catch (e) {
            // Either no image file was included, or there was a payload error
        }

        if (!url) {
            // See if there are any URLs to process
            try {
                if (msgData.entities.urls && Object.keys(msgData.entities.urls).length) {
                    // Only deal with one right now
                    url = msgData.entities.urls[0].expanded_url;
                }
            } catch (e) {

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
     * @name createPostData
     * @param {string} str
     * @returns {object}
     */
    function createPostData(str) {
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
     * Generates the authorization string for sending direct messages.
     * @name generateOAuth
     * @returns {string}
     */
    function generateOAuth() {
        const oauth_consumer_key = config.consumer_key;
        const oauth_nonce = crypto.randomBytes(32).toString('base64').replace(/\W/g, '');
        const oauth_signature_method = 'HMAC-SHA1';
        const oauth_timestamp = Math.floor(Date.now() / 1000);
        const oauth_version = '1.0';
        const oauth_token = config.access_token_key;
        const oauth_request_method = 'POST';
        const oauth_base_url = "".concat(config.twitterAPIHost, '/direct_messages/events/new.json');

        const oauth_parameters = new Map();
        oauth_parameters.set('oauth_consumer_key', oauth_consumer_key);
        oauth_parameters.set('oauth_nonce', oauth_nonce);
        oauth_parameters.set('oauth_signature_method', oauth_signature_method);
        oauth_parameters.set('oauth_timestamp', oauth_timestamp);
        oauth_parameters.set('oauth_token', oauth_token);
        oauth_parameters.set('oauth_version', '1.0');

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
        request.get(options).pipe(fs.createWriteStream(tmpFile.name)).on('close', function() {
            ocr.parseImageFromLocalFile(tmpFile.name, {
                apikey: config.ocr_apikey,
                language: 'eng'
            }).then(function (result) {
                sendDirectMessage("Here you go: \n" + result.parsedText + "\nThanks for using #ocrme!");
            }).catch(function (err) {
                console.log(err);
            });
        });
    }

    /**
     * Sends a direct message
     * @param {string} str
     */
    function sendDirectMessage(str) {
        if (userid) {
            const postData = createPostData(str);
            const oauth = generateOAuth();
            const options = {
                method: 'post',
                body: postData,
                json: true,
                url: "".concat(config.twitterAPIHost, '/direct_messages/events/new.json'),
                headers: {
                    Authorization: oauth,
                    'Content-Type': 'application/json'
                }
            };
            request(options, function(err, res, body) {
                if (err) {
                    console.log('err: ' + err);
                    throw err;
                }
            });
        }
    }

    /**
     * Module exports
     */
    const module = {};
    module.init = init;
    module.isDirectMessage = isDirectMessage;
    module.hasOcrHashTag = hasOcrHashTag;
    module.hasAttachment = hasAttachment;
    module.ocrResponse = ocrResponse;
    return module;
}

module.exports = twitocr;