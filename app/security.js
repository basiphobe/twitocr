/**
 * @file Provides security related functions
 */

'use strict';

const crypto = require('crypto');

/**
 * Creates a HMAC SHA-256 hash of the Twitter CRC token and Twitter app Consumer Secret.
 * @param  crc_token  the token provided by the incoming GET request
 * @param  consumer_secret the secret provided by Twitter
 * @return string
 */
module.exports.get_challenge_response = function(crc_token, consumer_secret) {
    return crypto.createHmac('sha256', consumer_secret).update(crc_token).digest('base64').toString();
};

/**
 * Creates a base64 HMAC SHA-1 hash.
 * @param  string - the string to be hashed
 * @param  secret - the secret to hash the string with
 * @return string
 */
module.exports.hmac_sha1 = function(string, secret) {
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(string);
    return hmac.digest('base64').toString();
};