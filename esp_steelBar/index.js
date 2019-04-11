/*
On the command line it is possible to POST a picture file like this:
    curl -F "file=@12.jpg" http://localhost/vf-OS_external_steelbar_service_client/barClassifier
 */

'use strict'

const Express = require('express')
const config = require('./config.js')
const expressNunjucks = require('express-nunjucks')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = new Express()
var proxy = require('http-proxy-middleware');


app.use(Express.static('static'))
app.use(cors())

app.set('views', __dirname + '/templates')
expressNunjucks(app, {
  watch: true,
  noCache: true
})

// Render the frontend page with config
app.get('/', function (req, res) {
  res.render('index', config.get())
})

app.use(bodyParser.json())
config.registerAPI(app)

// Defines a custom Router for the proxy. It takes info from 'config'
var customRouter = function(req) {
    var route = config.get().steelBarAuthority
    //console.log("customRouter to: ", route)
    return route;
};

// Defines a custom Path for the proxy. It takes info from 'config'
var customPathRewrite = function (path, req) {
    path = config.get().steelBarPath
    //console.log("to path = ", path)
    return path
}

// Define Proxy Options
var proxyOptions = {
    target: config.get().steelBarAuthority,
    changeOrigin: true,
    router: customRouter,
    pathRewrite: customPathRewrite
}

// Use proxy
app.use(
    config.get().esp_path,
    proxy(proxyOptions)
);

config.on('change', function () {
    console.log("steelBarAuthority = ", config.get().steelBarAuthority)
    console.log("steelBarPath = ", config.get().steelBarPath)
})


app.listen(9001, '0.0.0.0', () => {
  /* eslint-disable */
  console.log('Server is up!')
})
