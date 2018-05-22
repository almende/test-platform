'use strict';

var http = require('http');
var request = require('request');
const express = require('express');
const app = new express();


app.get('/', (req, res) => {

    // How to get the hostname that was given by the Traefik?? Or how to set it?

    const options = {
        url: 'http://127.0.0.1:9000' + '/person/all',
        method: 'GET',
        headers: {
            'Host' : 'nodejs-rest.docker.localhost',
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log('body = ' + body);
            res.send(body);
        }
    });

    /*
    // WORKS IF RUNNING node module.js but not in Docker
    const options = {
        url: 'http://127.0.0.1' + '/person/all',
        method: 'GET',
        headers: {
            'Host' : 'nodejs-rest.docker.localhost',
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log('body = ' + body);
            res.send(body);
        }
    });
    */

    /*
    //WORKS
    request('http://localhost:3000/person/all', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log('body = ' + body);
            res.send(body);
        }
    });
    */
});

app.listen(5000, () => {
    /* eslint-disable */
    console.log('Server is up!');
});