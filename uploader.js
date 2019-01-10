#!/usr/bin/env node
'use strict'

const fs = require('fs')
const http = require('http')
const https = require('https')
const md5File = require('md5-file')
const axios = require('axios')
const FormData = require('form-data')

const productName = process.argv[2]
const priceInfo = process.argv[3]
const major = process.argv[4]
const version = process.argv[5]

const fileName = process.argv[6]
const accessToken = process.argv[7]
const chunkMaxMB = isNaN(parseInt(process.argv[8])) ? 80 : parseInt(process.argv[8])

if (!accessToken || accessToken === null) {
  console.log('Call this script as "./uploader.js <product_names_en-us> <price_info_eur> <major> <version> <zipfile> <access_token>"')
  console.log('Example "./uploader.js opc_ua_driver 20.5 1.0 1.0 opc_ua.zip qSsY5N2RABd5lxoeGiYBsx4Xv5lzmKzqrplg1DghK9k"')
  process.exit(1)
}
const shortName = fileName.replace(/^.*[\\\/]/, '')

const params = {
  'product_names_en-us': productName,
  'price_info_eur': priceInfo,
  'major': major,
  'version': version,
  'zipfile': fileName,
  'access_token': accessToken,
  'shortName': shortName,
  'maxChunkSizeMB': chunkMaxMB
}
console.log('Starting with parameters:', params)

axios({
  url: '/v1/products',
  method: 'post',
  baseURL: 'https://vfos-datahub.ascora.de/',
  params: {
    access_token: accessToken
  },
  data: {
    'product_names_en-us': productName,
    'price_info_eur': priceInfo,
    'physical_product': false,
    'category_id': 2
  }
})
  .then(function (response) {
    fs.stat(fileName, function (error, stat) {
      if (error) { throw error }
      let chunkSize = chunkMaxMB * 1024 * 1024
      let chunks = (Math.floor(stat.size / chunkSize) + 1)

      let md5 = md5File.sync(fileName)
      var stream = fs.createReadStream(fileName, { highWaterMark: chunkSize })
      let i = 0
      let promises = []
      let lastRequest = null
      console.log('ProductID: ' + response.data.data.product.productId)
      console.log('current chunkSize..', chunkSize)
      console.log('number of chunks:', chunks)

      stream.on('data', function (chunk) {
        const formData = new FormData()

        console.log('current chunk..', i)
        console.log('length:', chunk.length)

        // console.log(file.slice(offset,offset+chunkSize));
        formData.append('product_id', response.data.data.product.productId)
        if (chunks > 1) {
          formData.append('binary_part', i + 1) // You're kidding, right?
          formData.append('binary_part_max', chunks)
          formData.append('binary_hash', md5)
        }
        formData.append('major', major)
        formData.append('version', version)
        formData.append('languages', 'en')

        console.log('formData:', formData)

        let attachedName = shortName + (chunks > 1 ? '.' + (i + 1) : '')
        // let attachedName = shortName + "."+(i+1)
        formData.append('binary', chunk, { 'contentType': 'application/zip', 'filename': attachedName })
        console.log('filename:' + attachedName)

        // push it to the server, except for the last chunk, that needs to be postponed until all others are done..... (Yes, really!)
        if (chunks <= 1 || i === chunks - 1) {
          lastRequest = formData
        } else {
          promises.push(axios({
            url: `https://vfos-datahub.ascora.de/v1/products/${response.data.data.product.productId}/programversions`,
            method: 'post',
            data: formData,
            // keepAlive pools and reuses TCP connections, so it's faster
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
            headers: formData.getHeaders(),
            maxContentLength: chunkSize * 1.2,
            params: {
              access_token: accessToken
            },
            onUploadProgress: (event) => {
              console.log(event)
            }
          }))
        }
        i++
      })
      stream.on('end', () => {
        console.log('Waiting for all but the last chunk to be uploaded, ', promises.length, ' chunks')
        Promise.all(promises).then(function (responses) {
          responses.map(function (response, index) {
            console.log(index + ':' + 'chunk uploaded.')
            if (response && response.data) {
              console.log(JSON.stringify(response.data))
            }
          })
          if (lastRequest && lastRequest !== null) {
            console.log('Start uploading last chunk.')
            axios({
              url: `https://vfos-datahub.ascora.de/v1/products/${response.data.data.product.productId}/programversions`,
              method: 'post',
              data: lastRequest,
              // keepAlive pools and reuses TCP connections, so it's faster
              httpAgent: new http.Agent({ keepAlive: true }),
              httpsAgent: new https.Agent({ keepAlive: true }),
              headers: lastRequest.getHeaders(),
              maxContentLength: chunkSize * 1.2,
              params: {
                access_token: accessToken
              },
              onUploadProgress: (event) => {
                console.log(event)
              }
            }).then((response) => {
              console.log('Last chunk, successfully uploaded.')
              if (response && response.data) {
                console.log(JSON.stringify(response.data))
              }
            })
          }
        }).catch(function (error) {
          console.log(error)
          if (error.response && error.response.data) {
            console.log(JSON.stringify(error.response.data))
          }
        })
      })
    })
  })
  .catch(function (error) {
    console.log(error)
  })
