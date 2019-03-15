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
    exec('/usr/src/app/uploader.js \'' + JSON.stringify(options) + '\'', (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout)
      } else {
        reject(error, stderr)
      }
    })
  })
}
let status = 'idle'
let productId = 0

const getPackagingRoutes = (app) => {
  const router = new Router()

  router
    .get('/', (req, res) => {
      res.send({ status: status, product_id: productId })
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
                if (labels['vf-OS.market.product']) {
                  options['product_id'] = labels['vf-OS.market.product']
                }
                if (labels['vf-OS.version.product']) {
                  options['product_id'] = labels['vf-OS.version.product']
                }
                productId = options['product_id']
                if (labels['vf-OS.version.major']) {
                  options['major'] = labels['vf-OS.version.major']
                }
                if (labels['vf-OS.version.version']) {
                  options['version'] = labels['vf-OS.version.version']
                }
                if (labels['vf-OS.market.category']) {
                  options['category'] = labels['vf-OS.market.category']
                }
                if (labels['vf-OS.market.price']) {
                  options['price_info_eur'] = labels['vf-OS.market.price']
                }
                if (labels['vf-OS.version.price']) {
                  options['price_info_eur'] = labels['vf-OS.version.price']
                }
                if (labels['vf-OS.market.maxChunkSizeMB']) {
                  options['maxChunkSizeMB'] = labels['vf-OS.market.maxChunkSizeMB']
                }
                if (labels['vf-OS.name']) {
                  options['product_names_en-us'] = labels['vf-OS.name']
                }
                options['access_token'] = req.query.access_token
                status = 'uploading, config:' + JSON.stringify(options)
                uploader(options).then((result) => {
                  status = 'done'
                  let reply = {
                    'result': result,
                    'product_id': productId,
                    'options': options
                  }
                  res.send(reply)
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
