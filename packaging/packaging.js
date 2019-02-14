'use strict'

const Router = require('express')
const exec = require('child_process').exec

const label2manifest = (imagename, additionalImages) => {
  return new Promise((resolve, reject) => {
    exec('/usr/src/app/label2manifest.js ' + imagename + ' true ' + additionalImages, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout)
      } else {
        reject(error, stderr)
      }
    })
  })
}

const getPackagingRoutes = (app) => {
  const router = new Router()

  router
    .get('/', (req, res) => {
      res.send('Please post to: /rest/imageName')
    })
    .post('/*', (req, res, next) => {
      let path = req.params[0]
      label2manifest(path, req.query.additionImages).then((result) => {
        res.send(result)
      }).catch((err) => {
        next(err)
      })
    })
  app.use('/rest', router)
}

module.exports = getPackagingRoutes
