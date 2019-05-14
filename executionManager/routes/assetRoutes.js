'use strict'

const Router = require('express')
const fs = require('fs')
const Asset = require('../model/Asset')
const exec = require('child_process').exec

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

  function getFullInfo (res) {
    let dumpcmd = '/usr/src/app/dump_info.sh'
    exec(dumpcmd, (error, stdout, stderr) => {
      if (!error) {
        res.setHeader('Content-Type', 'application/json')
        res.send(stdout)
      } else {
        res.setHeader('Content-Type', 'application/json')
        res.status(500)
        res.send({
          'error': error, 'stderr': stderr
        })
      }
    })
  }

  router
    .get('/', (req, res) => {
      getFullInfo(res)
    })
    .get('/full', (req, res) => {
      getFullInfo(res)
    })
    .get('/stats', (req, res) => {
      // We want to execute this command line:
      //      docker stats --no-stream --format "{\"containerID\":\"{{ .Container }}\", \"name\":\"{{ .Name }}\", \"cpu\":\"{{ .CPUPerc }}\", \"mem\":\"{{ .MemUsage }}\", \"memPerc\":\"{{ .MemPerc }}\", \"netIO\":\"{{ .NetIO }}\", \"blockIO\":\"{{ .BlockIO }}\", \"pids\":\"{{ .PIDs }}\"}"
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
          res.status(500)
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
          res.status(500)
          res.send({ 'error': error, 'stderr': stderr })
        }
      })
    })
    .get('/:id/compose_config', (req, res) => {
      // just get the file from disk
      var readStream = fs.createReadStream('/var/run/compose/3_' + req.params.id + '_compose.yml')
      readStream.pipe(res)
    })
    .get('/:id', async (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.send(Asset.readConfigFile(req.params.id))
    })
    .post('/:id', async (req, res) => {
      try {
        let data = req.body
        let asset = Asset.readConfigFile(req.params.id)
        if (asset) {
          if (data.id) {
            asset.id = data.id
          }
          asset.imageId = data.imageId
          let output = await asset.writeConfigFile()
          reload().then(() => {
            res.send({ result: 'OK', output: output })
          }).catch((err, stderr) => {
            res.setHeader('Content-Type', 'application/json')
            res.status(500)
            res.send({
              error: err,
              stderr: stderr
            })
          })
        } else {
          res.setHeader('Content-Type', 'application/json')
          res.status(404)
          res.send({ 'error': 'Cannot find asset:' + req.params.id })
        }
      } catch (e) {
        res.setHeader('Content-Type', 'application/json')
        res.status(500)
        res.send({ error: e })
      }
    })
    .put('/', async (req, res) => {
      try {
        let data = req.body
        let asset = Asset.readConfigFile(data.id)
        if (!asset) {
          asset = new Asset(data.id, data.imageId)
        }
        let output = await asset.writeConfigFile()
        reload().then(() => {
          res.send({ result: 'OK', output: output })
        }).catch((err, stderr) => {
          res.status(500)
          res.send({
            error: err,
            stderr: stderr
          })
        })
      } catch (e) {
        res.setHeader('Content-Type', 'application/json')
        res.status(500)
        res.send({ error: e })
      }
    })
    .delete('/:id', async (req, res) => {
      if (fs.existsSync('/var/run/compose/3_' + req.params.id + '_compose.yml')) {
        fs.unlinkSync('/var/run/compose/3_' + req.params.id + '_compose.yml')
      }
      reload().then(() => {
        res.send({ result: 'OK' })
      }).catch((err, stderr) => {
        res.status(500)
        res.send({
          error: err,
          stderr: stderr
        })
      })
    })

  app.use('/assets', router)
}

module.exports = getAssetRoutes
