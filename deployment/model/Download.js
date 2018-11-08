'use strict'

const downloader = require('download')
const fs = require('fs-extra')
const exec = require('child_process').exec

class Download {
  constructor (id, url) {
    this.id = id
    this.url = url
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
        setTimeout(this.install.bind(this), 0)
        break
      default:
      // Do nothing, just wait.
    }
  }

  updateStatus () {
    // Check status of files on fs and in register
    if (fs.existsSync('/usr/src/app/downloads/' + this.id + '.download.zip')) {
      this.status = 'Downloaded'
    }
    if (fs.existsSync('/usr/src/app/downloads/' + this.id + '.download.zip_unpacked') && fs.existsSync('/usr/src/app/downloads/' + this.id + '.download.zip_unpacked/manifest.json')) {
      this.status = 'Done' // Just assume that the actual push is done
    }
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
      fs.removeSync('downloads/' + this.id + '.download.zip')
      fs.removeSync('downloads/' + this.id + '.download.zip_unpacked')
    } catch (error) {}
  }

  install () {
    let me = this
    me.status = 'Installing'
    // Upload image to Registry: tag with registry:5000/assetName
    return new Promise((resolve, reject) => {
      exec('/usr/src/app/manifest2label.js /usr/src/app/downloads/' + me.id + '.download.zip false true registry', (error, stdout, stderr) => {
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
