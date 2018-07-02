/**
 * @file Handles GET/POST requests for the webhooks server.
 */

'use strict';

const express = require('express');
const router = express.Router({});
const security = require('../app/security');
const config = require('../config');
const twitocr = require('../app/twitocr')();

/**
 * GET route parsing
 * @name get/
 * @function
 * @inner
 * @param {string} path
 * @param {callback} query parser
 */
router.get('/', (req, res) => {
    if (req.query && Object.keys(req.query).length) {
        const crc_token = req.query.crc_token;
        if (crc_token && crc_token.length) {
            res.status(200).json({response_token: 'sha256=' + security.get_challenge_response(crc_token, config.consumer_secret)});
        } else {
            res.status(400).json({response_token: 'invalid token'});
        }
    } else {
        res.status(400).json({response_token: 'invalid parameter'});
    }
});

/**
 * POST route parsing
 * @name post/
 * @function
 * @inner
 * @param {string} path
 * @param {callback} body parser
 */
router.post('/', (req, res) => {
    let ocrAttempt = false;
    // Initialize the twitocr engine with the request body
    twitocr.init(req.body);
    // If we have everything we're looking for, attempt the OCR response
    if (twitocr.isDirectMessage() && twitocr.hasOcrHashTag() && twitocr.hasAttachment()) {
        ocrAttempt = true;
        twitocr.ocrResponse();
    }
    // Return success code and payload indicating whether or not the OCR attempt succeeded.
    res.status(200).json({ocrAttempt:ocrAttempt});
});

module.exports = router;