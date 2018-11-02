'use strict'

const exec = require('child_process').exec

class Asset {
  constructor (id, imageId, autoStart = false, containerName = 'Unknown') {
    this.id = id // instance ID, used as runtime name and URL prefix
    this.imageId = imageId // image ID, as used by docker image
    this.autoStart = autoStart
    this.containerName = containerName
    this.status = 'Unknown'

    this.updateStatus()
    setInterval(this.updateStatus.bind(this), 10000)
  }

  updateStatus () {
    this.getStatus().then((msg) => {
    }).catch((msg) => {
    })
  }

  getStatus () {
    let me = this
    let getRunning = () => {
      return new Promise((resolve, reject) => {
        exec('docker container ls --filter=\'label=com.docker.compose.service=' + me.id + '\' --format=\'{"name":{{json .Names}},"status":{{json .Status}}}\' -a', (error, stdout, stderr) => {
          if (!error) {
            if (stdout !== '') {
              let result = JSON.parse(stdout)
              if (result.status.startsWith('Up')) {
                me.status = 'Running'
                me.containerName = result.name
                resolve()
              } else {
                me.status = 'Stopped'
                me.containerName = result.name
                resolve()
              }
            } else {
              reject(error, stderr)
            }
          } else {
            // console.log('docker container ls gives error:', error, stderr, me)
            me.status = 'Unknown'
            reject(error, stderr)
          }
        })
      })
    }
    let getInstalled = () => {
      return new Promise((resolve, reject) => {
        exec('docker image ls ' + me.imageId + ' -q', (error, stdout, stderr) => {
          if (!error) {
            if (stdout !== '') {
              me.status = 'Installed'
              resolve()
            } else {
              me.status = 'Uninstalled'
              reject(error, stderr)
            }
          } else {
            // console.log('docker image ls gives error:', error, stderr, me)
            me.status = 'Unknown'
            reject(error, stderr)
          }
        })
      })
    }
    return new Promise((resolve, reject) => {
      getRunning().then(() => {
        resolve(me.status)
      }).catch(() => {
        getInstalled().then(() => {
          resolve(me.status)
        }).catch(() => {
          reject(me.status)
        })
      })
    })
  }

  getLabels (imageOnly = false) {
    let me = this
    if (!imageOnly && this.containerName !== 'Unknown' && (this.status === 'Running' || this.status === 'Stopped')) {
      return new Promise((resolve, reject) => {
        exec('docker container inspect ' + me.containerName + ' --format=\'{{json .Config.Labels}}\'', (error, stdout, stderr) => {
          if (!error) {
            resolve(JSON.parse(stdout))
          } else {
            reject(error, stderr)
          }
        })
      })
    } else {
      if (this.status === 'Unknown' || this.status === 'Uninstalled') {
        return Promise.resolve({})
      } else {
        return new Promise((resolve, reject) => {
          exec('docker image inspect ' + me.imageId + ' --format=\'{{json .Config.Labels}}\'', (error, stdout, stderr) => {
            if (!error) {
              resolve(JSON.parse(stdout))
            } else {
              reject(error, stderr)
            }
          })
        })
      }
    }
  }

  getComposeSection (networkId) {
    let me = this
    return new Promise((resolve, reject) => {
      me.getLabels(true).then((labels) => {
        // TODO: Depending on labels, generate config in json (conversion to yml is done later)
        let result = {}
        result['id'] = me.id
        result['image'] = me.imageId
        result['labels'] = ['traefik.frontend.rule=PathPrefixStrip:/' + me.id]
        result['networks'] = [networkId]
        resolve(result)

      }).catch((err, stderr) => {
        reject(err, stderr)
      })
    })
  }

  start () {
    let me = this
    return new Promise((resolve, reject) => {
      exec('docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml start ' + me.id, (error, stdout, stderr) => {
        if (!error) {
          me.status = 'Running'
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }

  stop () {
    let me = this
    return new Promise((resolve, reject) => {
      exec('docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml stop -t 5 ' + me.id, (error, stdout, stderr) => {
        if (!error) {
          me.status = 'Stopped'
          resolve(stdout)
        } else {
          reject(error, stderr)
        }
      })
    })
  }
}

Asset.reconstruct = function (obj) {
  return new Asset(obj.id, obj.imageId, obj.autoStart, obj.containerName)
}

module.exports = Asset
