#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec
const fs = require('fs')
const extract = require('extract-zip')
const tar = require('tar')
const jsonDiff = require('json-diff')

let zipFile = process.argv[2]
const deleteArtifacts = process.argv[3] ? JSON.parse(process.argv[3]) : false
const pushToRepository = process.argv[4] ? JSON.parse(process.argv[4]) : false
const registerHost = process.argv[5] ? process.argv[5] : 'localhost'

if (!zipFile) {
  console.log('Call this script as: ' + process.argv[1] + ' <zipFile> [<deleteArtifacts>] [<push2Repos>] [<registryHost>]')
  process.exit(1)
}

if (!zipFile.startsWith('/')) {
  zipFile = process.cwd() + '/' + zipFile
}

// Utility functions:

let unpack = function (zipFile) {
  return new Promise((resolve, reject) => {
    extract(zipFile, {
      dir: zipFile + '_unpacked'
    }, (err) => {
      if (!err) {
        try {
          let manifest = JSON.parse(fs.readFileSync(zipFile + '_unpacked/manifest.json', 'utf-8'))
          resolve(manifest)
        } catch (error) {
          reject(error)
        }
      } else {
        reject(err)
      }
    })
  })
}

let imageList = function (binfile) {
  return new Promise((resolve, reject) => {
    tar.x({ file: binfile }, ['manifest.json']).then(_ => {
      let dockerManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'))
      if (dockerManifest) {
        exec('rm -rf manifest.json', (error, stdout, stderr) => {
          if (error) {
            console.log('Failed to remove docker manifest.', error, stderr)
          }
        })
        let result = []
        dockerManifest.map((entry) => {
          if (entry.RepoTags) {
            result.push(entry.RepoTags)
          }
        })
        resolve(result)
      } else {
        reject(new Error('docker manifest not found'))
      }
    }).catch((err) => { reject(err) })
  })
}

let load = function (binfile) {
  return new Promise((resolve, reject) => {
    exec('docker load < ' + binfile, (error, stdout, stderr) => {
      if (!error) {
        console.log('Load into Docker done.')
        resolve(stdout)
      } else {
        reject(error, stderr)
      }
    })
  })
}

let getLabels = function (dockerImage) {
  return new Promise((resolve, reject) => {
    let labelCommand = 'docker image inspect ' + dockerImage
    exec(labelCommand, (error, stdout, stderr) => {
      if (!error) {
        let labels = JSON.parse(stdout)[0].Config.Labels
        resolve(labels)
      } else {
        reject(error, stderr)
      }
    })
  })
}

let compareLabels = function (manifest, labels) {
  let result = Object.assign({}, labels)

  Object.keys(manifest).map((key) => {
    if (key === 'binaryFile') return
    if (!key.startsWith('vf-OS')) {
      result['vf-OS.' + key] = manifest[key]
    } else {
      result[key] = manifest[key]
    }
  })
  return result
}

let createUpdatedImage = function (dockerImage, basename, diff) {
  return new Promise((resolve, reject) => {
    let text = []
    text.push('FROM ' + dockerImage)
    Object.keys(diff).map((key) => {
      text.push('LABEL ' + key + '="' + diff[key]['__new'] + '"')
    })
    // write Dockerfile
    fs.mkdirSync('tempBuild')
    fs.writeFileSync('tempBuild/Dockerfile', text.join('\n'))

    // Run docker build -t imageName:extended
    let buildCommand = 'docker build tempBuild -t ' + basename + ':extended'
    exec(buildCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      exec('rm -rf tempBuild', (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  })
}

let tag = function (original, newTag) {
  return new Promise((resolve, reject) => {
    exec('docker image tag ' + original + ' ' + newTag, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout)
      } else {
        reject(error, stderr)
      }
    })
  })
}

let push = function (dockerImage, basename) {
  return new Promise(async (resolve, reject) => {
    await tag(dockerImage, registerHost + ':5000/' + basename + ':latest')
    exec('docker image push ' + registerHost + ':5000/' + basename + ':latest', (error, stdout, stderr) => {
      if (!error) {
        resolve()
      } else {
        reject(error, stderr)
      }
    })
  })
}

let getFullImageName = function (imageFile, list) {
  let result = list[0][0]
  list.map((item) => {
    if (item[0].includes(imageFile)) {
      result = item[0]
    }
  })
  return result
}

// Main program:

let main = async function () {
  try {
    let manifest = await unpack(zipFile)
    console.log('Read manifest from zipfile:\n', manifest)
    let list = await imageList(zipFile + '_unpacked/' + manifest.binaryFile)
    console.log('Images to read into Docker repository:\n', list)
    await load(zipFile + '_unpacked/' + manifest.binaryFile)

    let fullImageName = getFullImageName(manifest.binaryFile, list)
    let labels = await getLabels(fullImageName)

    let newLabels = compareLabels(manifest, labels)
    let diff = jsonDiff.diff(labels, newLabels)

    if (diff) { // returns undefined on no changes
      console.log('Changed labels, rebuilding image:', jsonDiff.diffString(labels, newLabels))
      await createUpdatedImage(fullImageName, manifest.binaryFile, diff)
      fullImageName = manifest.binaryFile + ':extended'
    } else {
      console.log('No labels changed, using currently loaded image.')
    }

    if (pushToRepository) {
      await push(fullImageName, manifest.binaryFile)
      for (let i = 0; i < list.length; i++) {
        await push(list[i][0], list[i][0].replace(/:.*/, ''))
      }
    }
    if (deleteArtifacts) {
      console.log('Cleaning up behind me.')
      exec('rm -rf ' + zipFile + '_unpacked', (error, stdout, stderr) => {
        if (error) {
          console.log(error, stderr)
        } else {
          if (pushToRepository) {
            // Also cleanup local images
            exec('docker image rm ' + fullImageName + ' ' + registerHost + ':5000/' + manifest.binaryFile + ':latest',
              (error, stdout, stderr) => {
                if (error) {
                  console.log(error, stderr)
                } else {
                  console.log('Also cleaned images.')
                }
              })
          }
          console.log('Done cleanup.')
        }
      })
    }
  } catch (err) { console.error('Error', err) }
}
main()
