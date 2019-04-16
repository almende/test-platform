'use strict'

const downloader = require('download')
const fs = require('fs-extra')
const exec = require('child_process').exec
const axios = require('axios')

class Download {
  constructor (uuid, id, url, save) {
    this.uuid = uuid
    this.id = id
    this.url = url
    this.dependencies = null
    this.status = 'Initial'
    this.progress = {}

    this.save = save

    this.updateStatus()
    this.save()
    setInterval(this.proceed.bind(this), 5000)
  };

  proceed () {
    // check status, decide next step
    switch (this.status) {
      case 'Initial':
        setTimeout(this.download.bind(this), 0)
        break
      case 'GetId':
        setTimeout(this.getId.bind(this), 0)
        break
      case 'ToQuarantine':
        setTimeout(this.quarantine.bind(this), 0)
        break
      case 'CheckDeps':
        setTimeout(this.handleDependencies.bind(this), 0)
        break
      case 'Installable':
        setTimeout(this.install.bind(this), 0)
        break
      default:
      // Do nothing, just wait.
    }
  }

  testRegistry () {
    let me = this
    return axios({
      url: 'http://registry:5000/v2/' + me.id + '/manifests/latest',
      method: 'head'
    })
  }

  async updateStatus () {
    // Check status of files on fs and in register
    console.log('UpdateStatus', this.status)
    if (fs.existsSync('/usr/src/app/downloads/' + this.uuid + '.download.zip')) {
      this.status = 'Downloaded'
      if (this.id) {
        console.log('Id known')
        try {
          if (await this.testRegistry()) {
            if (this.dependencies) {
              this.status = 'Installable'
            } else {
              this.status = 'CheckDeps'
            }
          } else {
            this.status = 'ToQuarantine'
          }
        } catch (err) { console.error('failed to check registry', err) }
      } else {
        this.status = 'GetId'
      }
    } else {
      this.status = 'Initial'
    }
    console.log('UpdateStatus done:', this.status)
    setTimeout(this.proceed.bind(this), 0)
  }

  download () {
    let me = this
    me.status = 'Downloading'
    if (typeof me.url === 'undefined') {
      me.status = 'Error'
      me.errorReport = { error: 'url undefined' }
    } else {
      downloader(me.url, 'downloads', { 'filename': me.uuid + '.download.zip' })
        .on('downloadProgress', progress => {
          me.progress = progress
        })
        .on('error', (error, body, response) => {
          me.status = 'Error'
          me.errorReport = { error: error, body: body, response: response }
        })
        .then(() => {
          me.status = 'GetId'
        })
    }
  }

  getId () {
    let me = this
    if (fs.existsSync('/usr/src/app/downloads/' + me.uuid + '.download.zip')) {
      // check the manifest file for the ID
      exec('unzip -p downloads/' + me.uuid + '.download.zip manifest.json', (error, stdout, stderr) => {
        if (!error) {
          let manifest = JSON.parse(stdout)
          if (manifest.name) {
            me.id = manifest.name
          }
          // BinaryFile overrides:
          if (manifest.binaryFile) {
            me.id = manifest.binaryFile
          }
          if (manifest.dependencies) {
            me.dependencies = typeof manifest['dependencies'] === 'string' ? JSON.parse(manifest['dependencies']) : manifest['dependencies']
          }
          me.status = 'ToQuarantine'
          me.save()
        } else {
          console.log(error, stderr)
          me.status = 'Error'
          me.errorReport = { error: error, stderr: stderr }
        }
      })
    } else {
      me.status = 'Initial'
    }
  }

  deleteLocal () {
    this.status = 'Deleted'
    try {
      fs.removeSync('downloads/' + this.uuid + '.download.zip')
      fs.removeSync('downloads/' + this.uuid + '.download.zip_unpacked')
    } catch (error) {}
  }

  quarantine () {
    let me = this
    me.status = 'Push2quarantine'
    // Upload image to Registry: tag with registry:5000/assetName
    return new Promise((resolve, reject) => {
      exec('/usr/src/app/manifest2label.js /usr/src/app/downloads/' + me.uuid + '.download.zip false true registry', (error, stdout, stderr) => {
        if (!error) {
          if (!me.dependencies) {
            me.status = 'CheckDeps'
          } else {
            me.status = 'Installable'
          }
          me.save()
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }

  handleDependencies () {
    let me = this
    me.status = 'CheckingDeps'
    let labelCommand = 'docker image inspect ' + me.id
    console.log(me.status, 'checking:', labelCommand)
    // TODO: introduce recursive dependencies: Get dependencies and create new downloads with the productIds
    // Dump labels to get to dependencies
    exec(labelCommand, (error, stdout, stderr) => {
      if (error) {
        console.log(error, stderr)
      } else {
        let labels = JSON.parse(stdout)[0].Config.Labels
        console.log('found labels', labels)
        let dependencies = typeof labels['dependencies'] === 'string' ? JSON.parse(labels['dependencies']) : labels['dependencies']
        if (dependencies) {
          me.dependencies = dependencies
        }
      }
      me.status = 'Installable'
      me.save()
    })
  }

  install () {
    let me = this
    // Note: this call depends on the zipfile having the same name as the assetName within.
    axios({
      url: 'http://reverse-proxy/executionservices/assets/',
      method: 'put',
      data: { 'id': me.id, 'imageId': 'localhost:5000/' + me.id }
    }).then((response) => {
      me.status = 'Done'
      me.save()
    }).catch((error) => {
      console.log(error)
      me.status = 'Error'
      me.errorReport = { error: error }
      if (error.response && error.response.data) {
        console.log(JSON.stringify(error.response.data))
      }
    })
  }
}

Download.reconstruct = function (obj, save) {
  let download = new Download(obj.uuid, obj.id, obj.url, save)
  if (obj.dependencies) {
    download.dependencies = obj.dependencies
  }
  return download
}

module.exports = Download
