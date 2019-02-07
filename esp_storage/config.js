const Router = require('express')
const storage = require('node-persist')

let Config = {
  webdavUrl: 'https://owncloud.ascora.de/remote.php/webdav/',
  webdavUser: 'ludo@almende.org',
  webdavPassword: 'VHEMC-LBDZT-NPANF-KSWFX',
  registerAPI: function (app) {
    const router = new Router()
    router.get('/', (req, res) => {
      res.send(Config)
    }).post('/', (req, res) => {
      const values = req.body
      for (let item in values) {
        if (values.hasOwnProperty(item)) {
          Config[item] = values[item]
        }
      }
      storage.setItem('values', Config)
      res.send(Config)
    })
    app.use('/config', router)
  }
}
storage.init({ 'dir': '/persist/config' }).then(async () => {
  let values = await storage.getItem('values')
  if (values == null) {
    storage.setItem('values', Config)
  } else {
    for (let item in values) {
      if (values.hasOwnProperty(item)) {
        Config[item] = values[item]
      }
    }
  }
})

module.exports = Config
