#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec
const fs = require('fs')

let dockerImage = process.argv[2]
let folder = process.argv[3]
let volumeFolder = process.argv[4] ? process.argv[4] : process.cwd() + '/.persist/'
if (!volumeFolder.endsWith('/')) volumeFolder += '/'

if (!dockerImage && process.argv.length < 4) {
  console.log('Call this script as: ' + process.argv[1] + ' <dockerImage> <targetFolder> <volumesFolder>')
  process.exit(1)
}
let imageFile = dockerImage.replace(/.*\//gi, '')

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
      result[0]['labels'] = ['traefik.frontend.rule=PathPrefixStrip:/' + id]

      try {
        if (labels['compose']) {
          Object.keys(labels['compose']).map((assetKey, index) => {
            let asset = labels['compose'][assetKey]
            if (!result[index]) result[index] = {}
            // TODO: other fields
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
                    result[index]['volumes'].push(volumeFolder + 'shared_' + innerKey + '_persist:' + asset['volume']['shared'][innerKey])
                  })
                } else {
                  result[index]['volumes'].push(volumeFolder + dockerImage + '_' + index + '_' + volumeIndx + '_persist:' + asset['volume'][key])
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
          })
        }
      } catch (e) { console.log('could parse vf-OS.compose.0.socket', e) }

      // console.log(JSON.stringify(labels))
      // console.log(JSON.stringify(result))

      let services = ''
      result.map((res, index) => {
        if (res['image']) {
          let id = res['id'] ? res['id'] : 'unnamed_asset_' + index
          delete res['id']
          services += id + ':\n  ' + JSON.stringify(res) + '\n'
        } else {
          console.log('Missing docker image name for asset:', res, index)
        }
      })

      // Generate docker-compose file for this asset into folder
      fs.writeFileSync(folder + '/3_' + imageFile + '_compose.yml', 'version: "3"\nservices:\n ' + services)
    }
    // If parameter: call docker-compose image to reload asset
  })
}).catch((e) => {
  console.error('failed to pull image', e)
})
