'use strict';


const express = require('express');
const app = new express();

app.use(express.static('static'));

app.listen(9000, () => {
    /* eslint-disable */
    console.log('Server is up!');
});
