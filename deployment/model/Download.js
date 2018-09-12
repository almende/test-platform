'use strict'

const downloader = require('download')
const fs = require('fs')
const exec = require('child_process').exec

class Download {
  constructor (id, url) {
    this.id = id
    this.url = url
    this.status = 'Initial'
    this.progress = {}

    this.proceed()
    setInterval(this.proceed.bind(this), 2000)
  };

  proceed () {
    this.updateStatus()
    // check status, decide next step
    switch (this.status) {
      case 'Initial':
        setTimeout(this.download.bind(this), 0)
        break
      case 'Downloaded':
        setTimeout(this.unpack.bind(this), 0)
        break
      case 'Unpacked':
        setTimeout(this.install.bind(this), 0)
        break
      case 'Downloading':
      case 'Unpacking':
      case 'Installing':
      case 'Done':
      default:
      // Do nothing, just wait.
    }
  }

  updateStatus () {

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
    fs.unlinkSync('downloads/' + this.id + '.download.zip')
  }

  unpack () {
    // Check file format
    // Run unzip into temporary folder: two files
    // Load into local docker repos, with tag like temp/assetName
    // Compare meta-info with labels
    // If different, create Dockerfile with updated labels, built new image registry:5000/assetName
    // else retag image registry:5000/assetName
  }

  install () {
    let me = this
    // Upload image to Registry: tag with registry:5000/assetName
    return new Promise((resolve, reject) => {
      exec('docker image push registry:5000/' + me.id, (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }
}

module.exports = Download
