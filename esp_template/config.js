const Router = require('express')
const storage = require('node-persist')
var EventEmitter = require('events').EventEmitter

//Here is the actual config structure, modify to your needs.
const config = {
   some_config:true
}

const Config = Object.assign(new EventEmitter(), {
  registerAPI: function (app) {
    const router = new Router()
    router.get('/', (req, res) => {
      res.send(config)
    }).post('/', (req, res) => {
      const values = req.body
      for (let item in values) {
        if (values.hasOwnProperty(item)) {
          config[item] = values[item]
        }
      }
      storage.setItem('values', config)
      Config.emit('change')
      res.send(config)
    })
    app.use('/config', router)
  },
  get: function () {
    return config
  }
})

storage.init({ 'dir': '/persist/config' }).then(async () => {
  let values = await storage.getItem('values')
  if (values == null) {
    storage.setItem('values', config)
  } else {
    for (let item in values) {
      if (values.hasOwnProperty(item)) {
        config[item] = values[item]
      }
    }
    Config.emit('change')
  }
})
module.exports = Config
