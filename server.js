/**
 * @file Instantiates the weboooks server for receiving Twitter events.
 */

'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const routes = require('./routes');
const config = require('./config');

const port = config.server_port;

app.use(bodyParser.json());
app.use('/', routes);

// This instance happens to be running under a proxy, so trust the local IP.
// Refer to https://expressjs.com/en/guide/behind-proxies.html for details.
app.set('trust proxy', 'loopback');

app.listen(port, () => {
    console.log('twitocr running on port ' + port);
});
