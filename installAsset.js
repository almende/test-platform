#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec

let dockerImage = process.argv[2]

let imageFile = dockerImage.replace(/.*\//gi, '')

if (!dockerImage) {
  console.log('Call this script as: ' + process.argv[1] + ' <dockerImage>')
  process.exit(1)
}

let labelCommand = 'docker image inspect ' + dockerImage
exec(labelCommand, (error, stdout, stderr) => {
  if (error) {
    console.log(error, stderr)
  } else {
    console.log('Got metadata from docker image:', dockerImage)
    let labels = JSON.parse(stdout)[0].Config.Labels
    console.log(labels, imageFile)

    // Generate docker-compose file for this asset
    // If parameter: call docker-compose image to reload asset



  }
})
