/**
 * @file Instantiates the webhooks server for receiving Twitter Account Activity API events.
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

if (config.behindProxy) {
    app.set('trust proxy', 'loopback');
}

app.listen(port, () => {
    console.log('twitocr running on port ' + port);
});
