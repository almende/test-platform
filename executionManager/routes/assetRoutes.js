'use strict'

const Router = require('express')
const fs = require('fs')
const Asset = require('../model/Asset')
const exec = require('child_process').exec
const storage = require('node-persist')

const reload = function () {
  return new Promise((resolve, reject) => {
    exec('docker exec vf_os_platform_exec_control docker-compose up -d', (error, stdout, stderr) => {
      if (error) {
        reject(error, stderr)
      }
      resolve(stdout)
    })
  })
}

const getAssetRoutes = (app) => {
  const router = new Router()
  storage.init({ 'dir': '/persist/assetRoutes' }).then(async () => {
    let assets = await storage.getItem('assets')
    if (assets == null) {
      assets = []
      await storage.setItem('assets', assets)
    } else {
      assets = assets.map((entry) => {
        return Asset.reconstruct(entry)
      })
    }

    router
      .get('/', (req, res) => {
        Promise.all(assets.map((asset) => {
          return new Promise((resolve, reject) => {
            asset.getLabels().then((labels) => {
              asset['labels'] = labels
              resolve()
            }).catch(reject)
          })
        })).then(
          () => {
            res.send(assets)
          }
        ).catch(
          (errors) => {
            res.send(errors)
          }
        )
      })
      .get('/stats', (req, res) => {
        // We want to execute this command line:
        //      docker stats --no-stream --format "{\"containerID\":\"{{ .Container }}\", \"name\":\"{{ .Name }}\", \"cpu\":\"{{ .CPUPerc }}\", \"mem\":\"{{ .MemUsage }}\", \"memPerc\":\"{{ .MemPerc }}\", \"netIO\":\"{{ .NetIO }}\", \"blockIO\":\"{{ .BlockIO }}\", \"pids\":\"{{ .PIDs }}\"}"
        //

        let strFormat = {
          'containerID': '{{ .Container }}',
          'name': '{{ .Name }}',
          'cpu': '{{ .CPUPerc }}',
          'mem': '{{ .MemUsage }}',
          'memPerc': '{{ .MemPerc }}',
          'netIO': '{{ .NetIO }}',
          'blockIO': '{{ .BlockIO }}',
          'pids': '{{ .PIDs }}'
        }
        let statsCommand = 'docker stats --no-stream --format \'' + JSON.stringify(strFormat) + '\''

        exec(statsCommand, (error, stdout, stderr) => {
          if (!error) {
            let answer = {
              'stdout': stdout,
              'timestamp': Date.now()
            }

            // send answer
            res.setHeader('Content-Type', 'application/json')
            res.send(answer)
          } else {
            res.setHeader('Content-Type', 'application/json')
            // res.status(500).send({'error': error, 'stderr': stderr});
            res.send({
              'error': error, 'stderr': stderr
            })
          }
        })
      })
      .post('/logs', (req, res) => {
        let logsCommand = 'docker logs ' + req.body.containerName + ' | tail -n ' + req.body.numOfLines

        // let logsCommand = 'export TERM=linux-m1b;docker logs ' + req.body.containerName + ' | tail -n ' + req.body.numOfLines;
        // let logsCommand = 'docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml logs --no-color assetA'

        exec(logsCommand, (error, stdout, stderr) => {
          if (!error) {
            let answer = {
              'stdout': stdout,
              'timestamp': Date.now()
            }
            // console.log(JSON.stringify(answer))

            // send answer
            res.setHeader('Content-Type', 'application/json')
            res.send(answer)
          } else {
            // console.log('ERRORS logs')
            res.setHeader('Content-Type', 'application/json')
            // res.status(500).send({'error': error, 'stderr': stderr});
            res.send({ 'error': error, 'stderr': stderr })
          }
        })
      })
      .get('/:id/compose_config', (req, res) => {
        // just get the file from disk
        var readStream = fs.createReadStream('/var/run/compose/3_' + req.params.id + '_compose.yml')
        readStream.pipe(res)
      })
      .post('/:id', async (req, res) => {
        try {
          let idx = assets.length
          let data = req.body
          while (idx--) {
            if (assets[idx] && assets[idx].id === req.params.id) {
              let asset = assets[idx]
              if (data.autoStart !== null) {
                asset.autoStart = data.autoStart
              }
              if (data.imageId !== null) {
                asset.imageId = data.imageId
              }
              await storage.setItem('assets', assets)
              let output = await asset.writeConfigFile()
              reload().then(() => {
                res.send({ result: 'OK', output: output })
              }).catch((err, stderr) => {
                res.send({
                  error: err,
                  stderr: stderr
                })
              })
              return
            }
          }
        } catch (e) {
          res.send({ error: e })
        }
      })
      .put('/', async (req, res) => {
        let idx = assets.length
        let data = req.body
        while (idx--) {
          if (assets[idx] && assets[idx].id === data.id) {
            res.send({ error: 'Asset already exists! ' + data.id })
            return
          }
        }
        try {
          let asset = new Asset(data.id, data.imageId, data.autoStart)
          assets.push(asset)
          await storage.setItem('assets', assets)
          let output = await asset.writeConfigFile()
          reload().then(() => {
            res.send({ result: 'OK', output: output })
          }).catch((err, stderr) => {
            res.send({
              error: err,
              stderr: stderr
            })
          })
        } catch (e) {
          res.send({ error: e })
        }
      })
      .delete('/:id', async (req, res) => {
        let idx = assets.length
        while (idx--) {
          if (assets[idx] && assets[idx].id === req.params.id) {
            assets.splice(idx, 1)
            break
          }
        }
        await storage.setItem('assets', assets)
        if (fs.existsSync('/var/run/compose/3_' + req.params.id + '_compose.yml')) {
          fs.unlinkSync('/var/run/compose/3_' + req.params.id + '_compose.yml')
        }
        reload().then(() => {
          res.send({ result: 'OK' })
        }).catch((err, stderr) => {
          res.send({
            error: err,
            stderr: stderr
          })
        })
      })

    app.use('/assets', router)
  })
}

module.exports = getAssetRoutes
