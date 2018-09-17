'use strict';


const request = require('request');
const express = require('express');
const app = new express();

app.use(express.static('static'));

app.get('/', (req, res) => {

    // How to get the hostname that was given by the Traefik?? Or how to set it?

    const options = {
        // This shouldn't work:
        url: 'http://assetB:9000' + '/person/all',
        // This does work:
        //url: 'http://reverse-proxy' + '/assetB/person/all',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
        },
        timeout: 1500
    };
    request(options, function (error, response, body) {
        if (error) {
            res.send('error:' + error);
        }
        if (!error && response.statusCode == 200) {
            //console.log('body = ' + body);
            res.send(body);
        }
    });
});

app.listen(9001, () => {
    /* eslint-disable */
    console.log('Server is up!');
});
