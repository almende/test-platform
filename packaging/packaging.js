'use strict'

const Router = require('express')
const exec = require('child_process').exec

const dockerBuild = (path, imageName) => {
  return new Promise((resolve, reject) => {
    exec('docker build /data/' + path + ' -t ' + imageName, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout)
      } else {
        reject(error, stderr)
      }
    })
  })
}

const label2manifest = (imagename, additionalImages = '') => {
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
const uploader = (options) => {
  return new Promise((resolve, reject) => {
    exec('/usr/src/app/uploader.js ' + JSON.stringify(options), (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout)
      } else {
        reject(error, stderr)
      }
    })
  })
}
let status = 'idle'

const getPackagingRoutes = (app) => {
  const router = new Router()

  router
    .get('/', (req, res) => {
      res.send('status:' + status)
    })
    .post('/*', (req, res, next) => {
      let path = req.params[0]
      if (path) {
        if (!req.query.access_token) {
          next('query param: access_token missing: /path?access_token=ABCDEFG&assetName=someName')
        }
        let assetName = req.query.assetName
        if (!assetName) {
          assetName = path
        }
        status = 'building'
        dockerBuild(path, assetName).then((result) => {
          status = 'packaging'
          label2manifest(assetName, req.query.additionalImages).then((result) => {
            status = 'uploading'
            // Pull labels from image
            exec('/usr/src/app/dumpLabels.js ' + assetName, (error, stdout, stderr) => {
              if (error) {
                next(error)
              } else {
                // Use labels to generate config
                let labels = JSON.parse(stdout)
                let shortName = assetName.replace(/^.*[\\\/]/, '')
                let options = { 'zipfile': shortName + '.zip' }
                if (labels['vf-OS.product_id']) {
                  options['product_id'] = labels['vf-OS.product_id']
                }
                if (labels['vf-OS.major']) {
                  options['major'] = labels['vf-OS.major']
                }
                if (labels['vf-OS.version']) {
                  options['version'] = labels['vf-OS.version']
                }
                if (labels['vf-OS.category']) {
                  options['category'] = labels['vf-OS.category']
                }
                if (labels['vf-OS.price_info_eur']) {
                  options['price_info_eur'] = labels['vf-OS.price_info_eur']
                }
                if (labels['vf-OS.maxChunkSizeMB']) {
                  options['maxChunkSizeMB'] = labels['vf-OS.maxChunkSizeMB']
                }
                if (labels['vf-OS.name']) {
                  options['product_names_en-us'] = labels['vf-OS.name']
                }
                options['access_token'] = req.query.access_token
                uploader(options).then((res) => {
                  status = 'done'
                  res.send(res)
                }).catch((err) => {
                  next(err)
                })
              }
            })
          }).catch((err) => {
            next(err)
          })
        }).catch((err) => {
          next(err)
        })
      }
    })
  app.use('/rest', router)
}

module.exports = getPackagingRoutes
