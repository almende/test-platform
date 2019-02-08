'use strict'

const Express = require('express')
const config = require('./config.js')
const expressNunjucks = require('express-nunjucks')
const bodyParser = require('body-parser')
const app = new Express()

app.use(Express.static('static'))
app.set('views', __dirname + 'templates')
expressNunjucks(app, {
  watch: true,
  noCache: true
})
app.use(bodyParser.json())
config.registerAPI(app)

app.listen(9000, '0.0.0.0', () => {
  /* eslint-disable */
  console.log('Server is up!')
})
