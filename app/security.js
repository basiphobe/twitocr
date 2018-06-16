// https://github.com/twitterdev/account-activity-dashboard/blob/master/helpers/security.js

'use strict';

const crypto = require('crypto');
const jsSHA = require('jssha');

/**
 * Creates a HMAC SHA-256 hash created from the app TOKEN and
 * your app Consumer Secret.
 * @param  token  the token provided by the incoming GET request
 * @return string
 */
module.exports.get_challenge_response = function(crc_token, consumer_secret) {
    return crypto.createHmac('sha256', consumer_secret).update(crc_token).digest('base64');
};

// https://github.com/Caligatio/jsSHA
module.exports.hmac_sha1 = function(string, secret) {
    const shaObj = new jsSHA('SHA-1', 'TEXT');
    shaObj.setHMACKey(secret, 'TEXT');
    shaObj.update(string);
    return shaObj.getHMAC('B64');
};