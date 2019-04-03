'use strict'

const Router = require('express')
const Download = require('../model/Download')
const storage = require('node-persist')
const uuidv1 = require('uuid/v1')

const getDeploymentRoutes = (app) => {
  const router = new Router()
  storage.init({ 'dir': '/persist/deploymentRoutes' }).then(async () => {
    let save = async function () {
      await storage.setItem('downloads', downloads)
    }
    let downloads = await storage.getItem('downloads')
    if (downloads == null) {
      downloads = []
      await storage.setItem('downloads', downloads)
    } else {
      downloads = downloads.map((entry) => {
        return Download.reconstruct(entry, save)
      })
    }
    router
      .get('/', (req, res) => {
        res.send(downloads)
      })
      .get('/:uuid', (req, res) => {
        let idx = downloads.length
        while (idx--) {
          if (downloads[idx] && downloads[idx].uuid === req.params.uuid) {
            res.send(downloads[idx])
            return
          }
        }
        // Send HTTP status
        res.send({ error: 'No such Download: ' + req.params.uuid })
      })
      .put('/', async (req, res) => {
        // Create download, start
        let data = req.body
        try {
          let download = new Download(uuidv1(), data.id, data.url, save)
          downloads.push(download)
          res.send(JSON.stringify(download))
          await storage.setItem('downloads', downloads)
        } catch (e) {
          res.send({ error: e })
        }
      })
      .delete('/:uuid', (req, res) => {
        let idx = downloads.length
        while (idx--) {
          if (downloads[idx] && downloads[idx].uuid === req.params.uuid) {
            downloads[idx].deleteLocal()
            downloads.splice(idx, 1)
            res.send({ result: 'OK' })
            return
          }
        }
        // Send HTTP status
        res.send({ error: 'No such Download: ' + req.params.uuid })
      })
      .post('/:uuid', (req, res) => {
        // todo: Check for parameters, (re)start download
      })
    app.use('/downloads', router)
  })
}

module.exports = getDeploymentRoutes
