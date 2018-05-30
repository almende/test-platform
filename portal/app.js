'use strict';


const express = require('express');
const app = new express();


app.get('/', (req, res) => {
    res.send('Here\'s gonna be the portal!');
});

app.listen(9000, () => {
    /* eslint-disable */
    console.log('Server is up!');
});
