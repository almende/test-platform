'use strict'

var request = require('request')
const Express = require('express')
const app = new Express()

app.use(Express.static('static'))

app.get('/', (req, res) => {

  const options = {
    // This shouldn't work:
    // url: 'http://asset-b:9000' + '/person/all',
    // This does work:
    url: 'http://reverse-proxy/AssetB/person/all',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8'
    },
    timeout: 1500
  }
  request(options, function (error, response, body) {
    if (error) {
      res.send('error:' + error)
    }
    if (!error && response.statusCode === 200) {
      res.send(body)
    }
  })

})

app.listen(9001, () => {
  /* eslint-disable */
  console.log('Server is up!')
})
