'use strict'

const exec = require('child_process').exec
const fs = require('fs')
const yaml = require('js-yaml')
const rmdir = require('rimraf')

class Asset {
  constructor (id, imageId, config, containerName = 'Unknown') {
    this.id = id // instance ID, used as runtime name and URL prefix
    this.imageId = imageId // image ID, as used by docker image
    this.containerName = containerName
    this.status = 'Unknown'
    this.configuration = config

    this.updateStatus()
    setInterval(this.updateStatus.bind(this), 10000)
  }

  updateStatus () {
    this.getStatus().then((msg) => {
    }).catch((msg) => {
    })
  }

  writeConfigFile () {
    let me = this
    return new Promise((resolve, reject) => {
      exec('/usr/src/app/installAsset.js ' + me.imageId + ' ' + me.id + ' false /var/run/compose ' + process.env.HOST_PWD + '/.persist', (error, stdout, stderr) => {
        if (error) {
          reject(error, stderr)
        } else {
          resolve(stdout)
        }
      })
    })
  }

  getStatus () {
    let me = this
    let getRunning = () => {
      return new Promise((resolve, reject) => {
        exec('docker container ls --filter=\'label=com.docker.compose.service=' + me.id + '\' --format=\'{"name":{{json .Names}},"status":{{json .Status}}}\' -a', (error, stdout, stderr) => {
          if (!error) {
            if (stdout !== '') {
              try {
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
              } catch (err) {
                me.status = 'Unknown'
                reject(err, stdout)
              }
            } else {
              me.status = 'Unknown'
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
        if (!me.imageId) {
          me.status = 'Unknown'
          return Promise.resolve()
        }
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

  reload (id) {
    return new Promise((resolve, reject) => {
      exec('docker exec vf_os_platform_exec_control docker-compose kill ' + (id ? JSON.stringify(id) : ''), (error, stdout, stderr) => {
        if (error) {
          reject(error, stderr)
        }
        exec('docker exec vf_os_platform_exec_control docker-compose up -d ' + (id ? JSON.stringify(id) : ''), (error, stdout, stderr) => {
          if (error) {
            reject(error, stderr)
          }
          resolve(stdout)
        })
      })
    })
  }

  reloadAll () {
    let me = this
    let promises = []
    if (!me.id || me.id === '') {
      return Promise.reject(new Error('Error, asset has no valid id:' + JSON.stringify(me)))
    }
    if (!me.configuration) {
      return me.reload(me.id)
    }
    for (let idx in me.configuration.services) {
      if (me.configuration.services.hasOwnProperty(idx)) {
        promises.push(me.reload(idx))
      }
    }
    return Promise.all(promises)
  }

  deletePersistence () {
    let me = this
    if (!me.configuration) {
      return me.reload(me.id)
    }
    return new Promise((resolve, reject) => {
      try {
        let volumes = []
        for (let idx in me.configuration.services) {
          if (me.configuration.services.hasOwnProperty(idx)) {
            let service = me.configuration.services[idx]
            if (service.volumes) {
              service.volumes.map((volume) => {
                if (volume.indexOf('/.persist/') > 0) {
                  let path = volume.replace(/.*\/.persist\/([^:]+):.*/, '$1')
                  if (!path.startsWith('shared_')) {
                    volumes.push(path)
                  }
                }
              })
            }
          }
        }
        volumes.map((volume) => {
          return new Promise((resolve, reject) => {
            rmdir('/allPersist/' + volume, (error) => {
              if (error) { reject(error) } else { resolve('ok') }
            })
          })
        })
        Promise.all(volumes).then(() => {
          resolve('Dropped:' + JSON.stringify(volumes))
        }).catch((error) => { reject(error) })
      } catch (error) {
        reject(error)
      }
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
}

Asset.readConfigFile = function (id) {
  if (fs.existsSync('/var/run/compose/3_' + id + '_compose.yml')) {
    let res = yaml.safeLoad(fs.readFileSync('/var/run/compose/3_' + id + '_compose.yml'))
    let service = res['services'][id]
    return new Asset(id, service.image, res)
  } else {
    return new Asset(id)
  }
}

Asset.reconstruct = function (obj) {
  return new Asset(obj.id, obj.imageId, obj.configuration, obj.containerName)
}

module.exports = Asset
