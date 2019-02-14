'use strict'

const Express = require('express')
const bodyParser = require('body-parser')
const app = new Express()

app.use(Express.static('static'))

app.use(bodyParser.json())
require('./packaging.js')(app)

app.listen(9000, '0.0.0.0', () => {
  /* eslint-disable */
  console.log('Server is up!')
})
