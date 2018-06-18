// Environment: https://api.twitter.com/1.1/account_activity/all/development/webhooks
// {"id":"1006555705535553536","url":"https://aaronsthings.xyz/twitter","valid":true,"created_timestamp":"2018-06-12 15:15:56 +0000"}

'use strict';

const express = require('express');
const router = express.Router();
const security = require('../app/security');
const config = require('../config');

router.get('/', (req, res) => {
    if (Object.keys(req.query).length) {
        const crc_token = req.query.crc_token;
        if (crc_token.length) {
            res.status(200).json({response_token: 'sha256=' + security.get_challenge_response(crc_token, config.consumer_secret)});
        } else {
            res.status(400).json({response_token: 'invalid token'});
        }
    } else {
        res.status(400).json({response_token: 'invalid parameter'});
    }
});

router.post('/', (req, res) => {
    // Check for a direct message that contains an '#ocrme' hashtag, and an image.
    const twitocr = require('../app/twitocr')(req.body);
    if (twitocr.isDirectMessage) {
        if (twitocr.hasOcrHashTag) {
            if (twitocr.hasAttachment) {
                twitocr.ocrAttachment();
            }
        }
    }
    res.status(200).json({});
});

module.exports = router;