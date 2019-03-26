'use strict'

const downloader = require('download')
const fs = require('fs-extra')
const exec = require('child_process').exec
const http = require('http')
const axios = require('axios')

class Download {
  constructor (id, url) {
    this.id = id
    this.url = url
    this.status = 'Initial'
    this.progress = {}

    this.updateStatus()
    setInterval(this.proceed.bind(this), 5000)
  };

  proceed () {
    // check status, decide next step
    switch (this.status) {
      case 'Initial':
        setTimeout(this.download.bind(this), 0)
        break
      case 'ToQuarantine':
        setTimeout(this.quarantine.bind(this), 0)
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
    return new Promise((resolve, reject) => {
      http.request('http://registry:5000/v2/' + me.id + '/manifests/latest', { method: 'HEAD' }, (res) => {
        resolve(res.statusCode === 200)
      }).on('error', (e) => { reject(e) })
    })
  }

  async updateStatus () {
    // Check status of files on fs and in register
    if (fs.existsSync('/usr/src/app/downloads/' + this.id + '.download.zip')) {
      this.status = 'Downloaded'
    }
    try {
      if (await this.testRegistry()) {
        this.status = 'Installable'
      } else {
        this.status = 'ToQuarantine'
      }
    } catch (err) { console.error('failed to check registry', err) }

    setTimeout(this.proceed.bind(this), 0)
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
          me.status = 'Installable'
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

  quarantine () {
    let me = this
    me.status = 'Push2quarantine'
    // Upload image to Registry: tag with registry:5000/assetName
    return new Promise((resolve, reject) => {
      exec('/usr/src/app/manifest2label.js /usr/src/app/downloads/' + me.id + '.download.zip false true registry', (error, stdout, stderr) => {
        if (!error) {
          me.status = 'Installable'
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }

  install () {
    let me = this
    axios({
      url: 'http://reverse-proxy/executionservices/assets/',
      method: 'put',
      data: { 'id': me.id, 'imageId': 'localhost:5000/' + me.id }
    }).then((response) => {
      me.status = 'Done'
    }).catch((error) => {
      console.log(error)
      if (error.response && error.response.data) {
        console.log(JSON.stringify(error.response.data))
      }
    })
  }
}

Download.reconstruct = function (obj) {
  return new Download(obj.id, obj.url)
}

module.exports = Download
