'use strict'

const Express = require('express')
const config = require('./config.js')
const expressNunjucks = require('express-nunjucks')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = new Express()

app.use(Express.static('static'))
app.use(cors())

app.set('views', __dirname + '/templates')
expressNunjucks(app, {
  watch: true,
  noCache: true
})

app.get('/', function (req, res) {
  res.render('index', config.get())
})

app.use(bodyParser.json())
config.registerAPI(app)

// Here include the external webservice client:
require('./client.js').rest(app)

app.listen(9000, '0.0.0.0', () => {
  /* eslint-disable */
  console.log('Server is up!')
})
