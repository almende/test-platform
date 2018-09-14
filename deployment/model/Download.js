'use strict'

const downloader = require('download')
const fs = require('fs')
const exec = require('child_process').exec
const extract = require('extract-zip')

class Download {
  constructor (id, url) {
    this.id = id
    this.url = url
    this.remoteTag = id // todo: Allow override in metadata.
    this.manifest = {}
    this.status = 'Initial'
    this.progress = {}

    this.updateStatus()
    this.proceed()
    setInterval(this.proceed.bind(this), 2000)
  };

  proceed () {
    // check status, decide next step
    switch (this.status) {
      case 'Initial':
        setTimeout(this.download.bind(this), 0)
        break
      case 'Downloaded':
        setTimeout(this.convert.bind(this), 0)
        break
      case 'Unpacked':
        setTimeout(this.install.bind(this), 0)
        break
      case 'Downloading':
      case 'Unpacking':
      case 'Installing':
      case 'Done':
      case 'Error':
      default:
      // Do nothing, just wait.
    }
  }

  updateStatus () {
    // Check status of files on fs and in register
    if (fs.existsSync('/usr/src/app/downloads/' + this.id + '.download.zip')) {
      this.status = 'Downloaded'
    }
    if (fs.existsSync('/usr/src/app/downloads/' + this.id + '_unpacked/manifest.json')) {
      this.manifest = JSON.parse(fs.readFileSync('/usr/src/app/downloads/' + this.id + '_unpacked/manifest.json', 'utf-8'))
      this.status = 'Unpacked'
    }
    // todo: check existence of register:5000/this.id
  }

  download () {
    let me = this
    me.status = 'Downloading'
    if (typeof me.url === 'undefined') {
      me.status = 'Error'
      me.errorReport = { error: 'url undefined' }
    } else {
      downloader(me.url, 'downloads', { 'filename': me.id + '.download.zip' })
        .on('downloadProgress', progress => {
          me.progress = progress
        })
        .on('error', (error, body, response) => {
          me.status = 'Error'
          me.errorReport = { error: error, body: body, response: response }
        })
        .then(() => {
          me.status = 'Downloaded'
        })
    }
  }

  deleteLocal () {
    this.status = 'Deleted'
    try {
      fs.unlinkSync('downloads/' + this.id + '.download.zip')
    } catch (error) {}
  }

  tag (original, newTag) {
    return new Promise((resolve, reject) => {
      exec('docker image tag ' + original + ' ' + newTag, (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }

  unpack () {
    let me = this
    return new Promise((resolve, reject) => {
      extract('/usr/src/app/downloads/' + me.id + '.download.zip', {
        dir: '/usr/src/app/downloads/' + me.id + '_unpacked'
      }, (err) => {
        if (!err) {
          try {
            me.manifest = JSON.parse(fs.readFileSync('/usr/src/app/downloads/' + me.id + '_unpacked/manifest.json', 'utf-8'))
            resolve()
          } catch (error) {
            reject(error)
          }
        } else {
          reject(err)
        }
      })
    })
  }

  load () {
    let me = this
    return new Promise((resolve, reject) => {
      exec('docker load < downloads/' + me.id + '_unpacked/' + me.manifest.binaryFile, (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }

  convert () {
    let me = this
    me.status = 'Unpacking'
    return new Promise(async (resolve, reject) => {
      try {
        // Check file format
        // Run unzip into temporary folder: two files
        await me.unpack()
        // Load into local docker repos, with tag like temp/assetName
        await me.load()
        await me.tag(me.remoteTag, 'temp/' + me.id)
        // Compare meta-info with labels
        // If different, create Dockerfile with updated labels, built new image registry:5000/assetName
        // else retag image registry:5000/assetName
        await me.tag('temp/' + me.id, 'registry:5000/' + me.id)

        me.status = 'Unpacked'
      } catch (error) {
        me.status = 'Error'
        reject(error)
      }
    })
  }

  install () {
    let me = this
    me.status = 'Installing'
    // Upload image to Registry: tag with registry:5000/assetName
    return new Promise((resolve, reject) => {
      exec('docker image push registry:5000/' + me.id, (error, stdout, stderr) => {
        if (!error) {
          me.status = 'Done'
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }
}

Download.reconstruct = function (obj) {
  return new Download(obj.id, obj.url)
}

module.exports = Download
