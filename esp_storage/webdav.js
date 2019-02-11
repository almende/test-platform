const Router = require('express')
const Config = require('./config')
const { createClient } = require('webdav')

let client = null
const getWebdavCmds = {
  openClient: () => {
    console.log('Opening webdav connection to:', Config.get().webdavUrl, ' user:', Config.get().webdavUser)
    return createClient(Config.get().webdavUrl, {
      username: Config.get().webdavUser,
      password: Config.get().webdavPassword
    })
  },
  reconnect: () => {
    client = getWebdavCmds.openClient()
  },
  getFolder: (path) => {
    return client.getDirectoryContents('/' + path)
  },
  createFolder: (path) => {
    client.createDirectory(path)
  },
  getFileReadStream: (path) => {
    return client.createReadStream(path)
  },
  getFileWriteStream: (path) => {
    return client.createWriteStream(path)
  },
  client: client
}

const getWebdavRoutes = (app) => {
  const router = new Router()
  router.get('/*/stream', (req, res) => {
    let path = req.params[0].replace('/stream', '')
    console.log('Trying to get file:', path)
    res.setHeader('content-type', 'application/octet-stream ')
    getWebdavCmds.getFileReadStream(path).pipe(res)
  }).post('/*/stream', (req, res) => {
    let path = req.params[0].replace('/stream', '')
    console.log('trying to upload file to:', path)
    req.pipe(getWebdavCmds.getFileWriteStream(path))
    res.send({})
  }).get('/*', (req, res) => {
    let path = req.params[0]
    console.log('Trying to get folder:', path)
    getWebdavCmds.getFolder(path).then((result) => {
      res.setHeader('content-type', 'application/json ')
      res.send(result)
    }).catch((error) => {
      res.send('Folder Error:' + error.toString())
    })
  }).post('/*', (req, res) => {
    let path = req.params[0]
    console.log('Trying to create folder:', path)
    getWebdavCmds.createFolder(path)
    res.send({})
  })
  app.use('/webdav', router)
}

Config.on('change', getWebdavCmds.reconnect)
if (!client) {
  getWebdavCmds.reconnect()
}
module.exports = { 'rest': getWebdavRoutes, 'obj': getWebdavCmds }
