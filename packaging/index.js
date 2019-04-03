'use strict'

const Express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = new Express()

app.use(Express.static('static'))
app.use(cors())

app.use(bodyParser.json())
require('./packaging.js')(app)

app.listen(9000, '0.0.0.0', () => {
  /* eslint-disable */
  console.log('Server is up!')
})
