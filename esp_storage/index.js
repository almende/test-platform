'use strict'

const Express = require('express')
const config = require('./config.js')
const bodyParser = require('body-parser')
const app = new Express()

app.use(Express.static('static'))
app.use(bodyParser.json())
config.registerAPI(app)

app.listen(9000, '0.0.0.0', () => {
  /* eslint-disable */
  console.log('Server is up!')
})
