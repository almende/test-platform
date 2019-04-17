'use strict'

const Router = require('express')
const exec = require('child_process').exec
const uuidv1 = require('uuid/v1')

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

const localInstall = (imageName) => {
  return new Promise((resolve, reject) => {
    exec('/usr/src/app/installAsset.js ' + imageName + ' ' + imageName + ' false /var/run/compose ' + process.env.HOST_PWD, (error, stdout, stderr) => {
      if (error) {
        reject(error, stderr)
      } else {
        resolve(stdout)
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
let active = {}
let finished = []

function handleRun (run, accessToken) {
  dockerBuild(run.path, run.assetName).then((result) => {
    run.status = 'local_install'
    localInstall(run.assetName).then((result) => {
      if (!run.upload) {
        run.status = 'done'
      } else {
        run.status = 'packaging'
        label2manifest(run.assetName, run.additionalImages).then((result) => {
          run.status = 'uploading'
          // Pull labels from image
          exec('/usr/src/app/dumpLabels.js ' + run.assetName, (error, stdout, stderr) => {
            if (error) {
              console.log(error)
              run['error'] = JSON.stringify(error)
            } else {
              // Use labels to generate config
              let labels = JSON.parse(stdout)
              let shortName = run.assetName.replace(/^.*[\\\/]/, '')
              let options = { 'zipfile': shortName + '.zip' }
              if (labels['vf-OS.market.product']) {
                options['product_id'] = labels['vf-OS.market.product']
              }
              if (labels['vf-OS.version.product']) {
                options['product_id'] = labels['vf-OS.version.product']
              }
              run['productId'] = options['product_id']
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
              options['access_token'] = accessToken
              run['config'] = JSON.stringify(options)
              run.status = 'uploading'
              uploader(options).then((result) => {
                run.status = 'done'
                delete active[run.uuid]
                finished.push(run)
                if (finished.length > 5) {
                  finished.shift()
                }
              }).catch((err) => {
                console.log(err)
                run['error'] = JSON.stringify(err)
              })
            }
          })
        }).catch((err) => {
          console.log(err)
          run.status = 'error'
          run['error'] = JSON.stringify(err)
        })
      }
    }).catch((err) => {
      console.log(err)
      run.status = 'error'
      run['error'] = JSON.stringify(err)
    })
  }).catch((err) => {
    console.log(err)
    run.status = 'error'
    run['error'] = JSON.stringify(err)
  })
}

const getPackagingRoutes = (app) => {
  const router = new Router()

  router
    .get('/', (req, res) => {
      res.send({ active: active, finished: finished })
    })
    .get('/:id', (req, res) => {
      let result = {}
      if (active[req.params.id]) {
        result = active[req.params.id]
      } else {
        finished.map((item) => {
          if (item.uuid === req.params.id) {
            result = item
          }
        })
      }
      res.send(result)
    })
    .post('/*', (req, res, next) => {
      let path = req.params[0]
      if (path) {
        let upload = true
        if (req.query.upload) {
          upload = Boolean.valueOf(req.query.upload)
          if (req.query.upload === 'false') {
            upload = false
          }
        }
        if (upload && !req.query.access_token) {
          next('query param: access_token missing: /path?access_token=ABCDEFG&assetName=someName&upload=true|false')
        }
        let assetName = req.query.assetName
        if (!assetName) {
          assetName = path
        }

        let run = {
          status: 'building',
          upload: upload,
          uuid: uuidv1(),
          assetName: assetName,
          path: path,
          additionalImages: req.query.additionalImages
        }
        active[run.uuid] = run
        res.send(run)
        setTimeout(handleRun.bind(this, run, req.query.access_token), 0)
      }
    })
  app.use('/rest', router)
}

module.exports = getPackagingRoutes
