// Environment: https://api.twitter.com/1.1/account_activity/all/development/webhooks

'use strict';

const request = require('request');
const crypto = require('crypto');
const security = require('./security');
const config = require('../config');
const myHashTag = 'ocrme';
const apiHost = 'https://api.twitter.com/1.1';

function twitocr(_body) {
    let body = _body;
    let dmEvent = null;
    let msgData = null;
    let hashtags = [];
    let userid = null;
    let attachment = null;

    function init() {
        try {
            dmEvent = body.direct_message_events.length > 0 ? body.direct_message_events[0] : null;
            msgData = dmEvent ? dmEvent.message_create.message_data : null;
            userid = dmEvent ? dmEvent.message_create.sender_id : null;
            hashtags = getHashTags();
            attachment = getAttachment();
        } catch (e) {
            // Payload error, probably
        }
    }

    function getHashTags() {
        let result = [];
        if (msgData) {
            try {
                const hashtags = msgData.entities.hashtags;
                for (let i = 0; i < hashtags.length; i++) {
                    result.push(hashtags[i].text);
                }
            } catch (e) {
                // Payload error, probably
            }
        }
        return result;
    }

    function getAttachment() {
        let result = null;
        try {
            result = msgData.attachment;
        } catch (e) {
            // Payload error, probably
        }
        return result;
    }

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

    function generateOAuth() {
        const oauth_consumer_key = config.consumer_key;
        const oauth_nonce = crypto.randomBytes(32).toString('base64').replace(/\W/g, '');
        const oauth_signature_method = 'HMAC-SHA1';
        const oauth_timestamp = Math.floor(Date.now() / 1000);
        const oauth_version = '1.0';
        const oauth_token = config.access_token_key;
        const oauth_request_method = 'POST';
        const oauth_base_url = "".concat(apiHost, '/direct_messages/events/new.json');

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

    function buildBaseString(method, baseUrl, params) {
        let paramArray = [];
        params.forEach((val,key) => {
            paramArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
        });

        return method.toUpperCase() + '&' + encodeURIComponent(baseUrl) + '&' + encodeURIComponent(paramArray.join('&'));
    }

    init();

    const module = {};
    module.isDirectMessage = (dmEvent);
    module.hasOcrHashTag = (hashtags.includes(myHashTag));
    module.hasAttachment = (attachment);
    module.sendDirectMessage = function(str) {
        if (userid) {
            const postData = createPostData(str);
            let oauth = generateOAuth();
            const options = {
                method: 'post',
                body: postData,
                json: true,
                url: "".concat(apiHost, '/direct_messages/events/new.json'),
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
    };
    return module;
}

module.exports = twitocr;