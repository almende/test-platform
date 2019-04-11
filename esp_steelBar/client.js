//const Router = require('express')
const Config = require('./config')
/*
const getSteelBarRoutes = (app) => {
    const router = new Router()
    router.post('/api/identify', (req, res) => {

        var url = Config.get().steelBarUrl
        // Send file to server

        // get answer

        // reply to client

        result = {"SteeeeeeelType":["A500NRSD"],"uploaded":true}
        res.setHeader('content-type', 'application/json ')
        res.send(result)
    }).get('/test', (req, res) => {

        res.setHeader('content-type', 'application/json ')
        res.send("test here")

    })
    app.use('/steelbar', router)
}
*/

Config.on('change', function () {
    console.log("CONFIG CHANGED!")
})

module.exports = { 'rest': {}, 'obj': {} }
