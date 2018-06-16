'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const routes = require('./routes');
const port = 7000;

app.use(bodyParser.json());
app.use('/', routes);
app.set('trust proxy', 'loopback');
app.listen(port, () => {
    console.log('twitocr running on ' + port);
});
