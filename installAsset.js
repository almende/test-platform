#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec
const fs = require('fs')

const dockerImage = process.argv[2]
const reload = process.argv[3] ? JSON.parse(process.argv[3]) : false
const folder = process.argv[4] ? process.argv[4] : process.cwd() + '/.compose/'
let volumeFolder = process.argv[5] ? process.argv[5] : process.cwd() + '/.persist/'
if (!volumeFolder.endsWith('/')) volumeFolder += '/'

if (!dockerImage && process.argv.length < 3) {
  console.log('Call this script as: ' + process.argv[1] + ' <dockerUrl> [<reload>] [<targetFolder>] [<volumesFolder>]')
  process.exit(1)
}
let imageFile = dockerImage.replace(/.*\//gi, '').replace(/:.*/gi, '')

function getOverrides (label) {
  switch (label) {
    case 'che':
      return ['traefik.frontend.entryPoints=che', 'traefik.frontend.rule=PathPrefix:/', 'traefik.port=8081']
    default:
      console.log('Unknown override requested')
  }
  return ''
}

new Promise((resolve, reject) => {
  if (dockerImage.includes(':')) {
    let pullCommand = 'docker pull ' + dockerImage
    exec(pullCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error, stderr)
      } else {
        resolve()
      }
    })
  } else {
    resolve()
  }
}).then(_ => {
  let labelCommand = 'docker image inspect ' + dockerImage
  exec(labelCommand, (error, stdout, stderr) => {
    if (error) {
      console.log(error, stderr)
    } else {
      console.log('Got metadata from docker image:', dockerImage)
      let labelObj = JSON.parse(stdout)[0].Config.Labels
      let labels = {}
      Object.keys(labelObj).map((key) => {
        let keyFields = key.split('.')
        let pointer = labels
        for (let i = 1; i < keyFields.length; i++) { // Skip highest level item (vf-OS.)
          if (!pointer[keyFields[i]]) {
            pointer[keyFields[i]] = (i === keyFields.length - 1) ? labelObj[key] : {}
          }
          pointer = pointer[keyFields[i]]
        }
      })
      let result = []
      let id = labels['name'] ? labels['name'] : imageFile

      result[0] = {}
      result[0]['id'] = id
      result[0]['image'] = dockerImage

      try {
        if (labels['compose']) {
          Object.keys(labels['compose']).map((assetKey, index) => {
            let asset = labels['compose'][assetKey]
            if (!result[index]) result[index] = {}
            if (!result[index]['labels']) result[index]['labels'] = []

            if (index > 0) {
              if (asset['image']) result[index]['image'] = asset['image']
              if (asset['serviceName']) result[index]['id'] = asset['serviceName']
            }
            if (asset['depends_on']) {
              if (!result[index]['depends_on']) result[index]['depends_on'] = []
              if (typeof asset['depends_on'] === 'string') {
                asset['depends_on'] = { 0: asset['depends_on'] }
              }
              Object.keys(asset['depends_on']).map((key) => {
                result[index]['depends_on'].push(asset['depends_on'][key])
              })
            }
            if (asset['volumes']) {
              asset['volume'] = Object.assign(asset['volume'] ? asset['volume'] : {}, asset['volumes'])
            }
            if (asset['volume']) {
              if (!result[index]['volumes']) result[index]['volumes'] = []
              Object.keys(asset['volume']).map((key, volumeIndx) => {
                if (key === 'shared') {
                  Object.keys(asset['volume']['shared']).map((innerKey) => {
                    if (typeof asset['volume']['shared'][innerKey] === 'object') {
                      Object.keys(asset['volume']['shared'][innerKey]).map((deeperKey) => {
                        result[index]['volumes'].push(volumeFolder + 'shared_' + innerKey + '_persist/' + deeperKey + ':' + asset['volume']['shared'][innerKey][deeperKey])
                      })
                    } else {
                      result[index]['volumes'].push(volumeFolder + 'shared_' + innerKey + '_persist:' + asset['volume']['shared'][innerKey])
                    }
                  })
                } else {
                  result[index]['volumes'].push(volumeFolder + imageFile + '_' + index + '_' + volumeIndx + '_persist:' + asset['volume'][key])
                }
              })
            }
            if (asset['environment']) {
              if (!result[index]['environment']) result[index]['environment'] = []
              Object.keys(asset['environment']).map((key) => {
                result[index]['environment'].push(key + '=' + asset['environment'][key])
              })
            }
            if (asset['socket'] && JSON.parse(asset['socket'])) {
              if (!result[index]['volumes']) result[index]['volumes'] = []
              result[index]['volumes'].push('/var/run/docker.sock:/var/run/docker.sock')
            }
            if (asset['traefikOverride']) {
              result[index]['traefikOverride'] = asset['traefikOverride']
            }
            if (asset['urlprefixReplace']) {
              result[index]['urlprefixReplace'] = asset['urlprefixReplace']
            }
            if (asset['port']) {
              result[index]['labels'].push('traefik.port=' + asset['port'])
            }
            if (asset['hostname']) {
              result[index]['hostname'] = asset['hostname']
            }
          })
        }
      } catch (e) { console.log('Had trouble parsing the labels!', e) }

      let services = ''
      result.map((res, index) => {
        if (res['image']) {
          let id = res['id'] ? res['id'] : 'unnamed_asset_' + index
          if (!res['labels']) {
            res['labels'] = []
          }
          if (!res['traefikOverride']) {
            if (!res['urlprefixReplace'] || res['urlprefixReplace']) {
              res['labels'].push('traefik.frontend.rule=PathPrefix:/' + id + ';ReplacePathRegex: ^/' + id + '/(.*) /$$1')
            } else {
              res['labels'].push('traefik.frontend.rule=PathPrefix:/' + id)
            }
          } else {
            res['labels'].concat(getOverrides(res['traefikOverride']))
          }
          delete res['traefikOverride']
          delete res['id']
          services += ' ' + id + ':\n  ' + JSON.stringify(res) + '\n'
        } else {
          console.log('Missing docker image name for asset:', res, index)
        }
      })

      // Generate docker-compose file for this asset into folder
      fs.writeFileSync(folder + '/3_' + imageFile + '_compose.yml', 'version: "3"\nservices:\n' + services)
      // If parameter: call docker-compose image to reload asset
      if (reload) {
        exec('docker exec vf_os_platform_exec_control docker-compose up -d', (error, stdout, stderr) => {
          if (error) {
            console.log('Failed to reload the platform.', stderr)
          } else {
            console.log('Platform reloaded.', stdout)
          }
        })
      }
    }
  })
}).catch((e) => {
  console.error('failed to pull image', e)
})
