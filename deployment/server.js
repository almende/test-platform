'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const server = new express();

// register JSON parser middlewear
server.use(bodyParser.json())
server.use(cors())

require('./routes/deploymentRoutes')(server);

server.listen(9000, () => {

    /* eslint-disable */
    console.log('Server is up!');
});
