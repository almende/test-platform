#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec
const fs = require('fs')

let dockerImage = process.argv[2]
let folder = process.argv[3]

if (!dockerImage) {
  console.log('Call this script as: ' + process.argv[1] + ' <dockerImage> <targetFolder>')
  process.exit(1)
}
let imageFile = dockerImage.replace(/.*\//gi, '')

function isNumeric (a) {
  var b = a && a.toString()
  return !Array.isArray(a) && b - parseFloat(b) + 1 >= 0
}

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
          pointer[keyFields[i]] = (i === keyFields.length - 1) ? labelObj[key] : (isNumeric(keyFields[i + 1])) ? [] : {}
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
        labels['compose'].map((asset, index) => {
          if (!result[index]) result[index] = {}
          // TODO: other fields
          if (asset['socket'] && JSON.parse(asset['socket'])) {
            if (!result[index]['volumes']) result[index]['volumes'] = []
            result[index]['volumes'].push('/var/run/docker.sock:/var/run/docker.sock')
          }
        })
      }
    } catch (e) { console.log('could parse vf-OS.compose.0.socket', e) }

    console.log(labels, result, imageFile)
    let services = ''
    result.map((res) => {
      let id = res['id']
      delete res['id']
      services += id + ':\n  ' + JSON.stringify(res) + '\n'
    })

    // Generate docker-compose file for this asset into folder
    fs.writeFileSync(folder + '/3_' + imageFile + '_compose.yml', 'version: "3"\nservices:\n ' + services)

    // If parameter: call docker-compose image to reload asset
  }
})
