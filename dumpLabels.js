#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec
const dockerImage = process.argv[2]

let labelCommand = 'docker image inspect ' + dockerImage
exec(labelCommand, (error, stdout, stderr) => {
  if (error) {
    console.log(error, stderr)
  } else {
    console.log(JSON.parse(stdout)[0].Config.Labels)
  }
})
