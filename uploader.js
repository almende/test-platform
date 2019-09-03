#!/usr/bin/env node
'use strict'

const fs = require('fs')
const http = require('http')
const https = require('https')
const md5File = require('md5-file')
const axios = require('axios')
const FormData = require('form-data')

let parameters = {}
if (process.argv[2]) {
  parameters = JSON.parse(process.argv[2])
}
const defaults = {
  'price_info_eur': 0.1,
  'major': '1.0',
  'version': 1.0,
  'category': 2,
  'maxChunkSizeMB': 80
}

let params = Object.assign(defaults, parameters)
if (!params.shortName && params['zipfile']) {
  params['shortName'] = params.zipfile.replace(/^.*[\\\/]/, '')
}
if (!params.zipfile || !params.access_token) {
  console.log('Call this script as ./uploader.js \'{"product_id":142,"zipfile":"opc_ua.zip","major":"1.0","version":20.5,"product_names_en-us":"opc_ua_driver","access_token":"qSsY5N2RABd5lxoeGiYBsx4Xv5lzmKzqrplg1DghK9k", "user_token":"ABCDEFG"}\'')
  console.log('with zipfile and access_token manditory. If product_id is given, the product creation is skipped, ignoring pricing and product_names_en-us, etc. User_token is optional, but recommended.')
  process.exit(1)
}
console.log('Starting with parameters:', JSON.stringify(params))
if (!params.user_token) {
  console.log('user_token not given, not sending Bearer token.')
}

let productCreated = Promise.resolve(params.product_id)
if (!params.product_id) {
  let headers = {}
  if (params.user_token) {
    headers['Authorization'] = 'Bearer ' + params.user_token
  }
  productCreated = new Promise((resolve, reject) => {
    axios({
      url: '/v1/products',
      method: 'post',
      baseURL: 'https://vfos-datahub.ascora.de/',
      params: {
        access_token: params.access_token
      },
      headers: headers,
      data: {
        'product_names_en-us': params['product_names_en-us'],
        'price_info_eur': params.price_info_eur,
        'physical_product': false,
        'category_id': params.category
      }
    }).then((response) => {
      console.log('Created new product Id:', response.data.data.product.productId)
      resolve(response.data.data.product.productId)
    }).catch((err) => { reject(err) })
  })
}
productCreated.then(function (productId) {
  fs.stat(params.zipfile, function (error, stat) {
    if (error) { throw error }
    let chunkSize = params.maxChunkSizeMB * 1024 * 1024
    let chunks = (Math.floor(stat.size / chunkSize) + 1)

    let md5 = md5File.sync(params.zipfile)
    var stream = fs.createReadStream(params.zipfile, { highWaterMark: chunkSize })
    let i = 0
    let promises = []
    let lastRequest = null

    console.log('current chunkSize..', chunkSize)
    console.log('number of chunks:', chunks)

    stream.on('data', function (chunk) {
      const formData = new FormData()

      console.log('current chunk..', i)
      console.log('length:', chunk.length)

      // console.log(file.slice(offset,offset+chunkSize));
      formData.append('product_id', productId)
      if (chunks > 1) {
        formData.append('binary_part', i + 1) // You're kidding, right?
        formData.append('binary_part_max', chunks)
        formData.append('binary_hash', md5)
      }
      formData.append('major', params.major)
      formData.append('version', params.version)
      formData.append('languages', 'en')

      let attachedName = params.shortName + (chunks > 1 ? '.' + (i + 1) : '')
      // let attachedName = shortName + "."+(i+1)
      formData.append('binary', chunk, { 'contentType': 'application/zip', 'filename': attachedName })
      console.log('filename:' + attachedName)

      // push it to the server, except for the last chunk, that needs to be postponed until all others are done..... (Yes, really!)
      if (chunks <= 1 || i === chunks - 1) {
        lastRequest = formData
      } else {
        let headers = formData.getHeaders()
        if (params.user_token) {
          headers['Authorization'] = 'Bearer ' + params.user_token
        }
        promises.push(axios({
          url: 'https://vfos-datahub.ascora.de/v1/products/' + productId + '/programversions',
          method: 'post',
          data: formData,
          // keepAlive pools and reuses TCP connections, so it's faster
          httpAgent: new http.Agent({ keepAlive: true }),
          httpsAgent: new https.Agent({ keepAlive: true }),
          headers: headers,
          maxContentLength: chunkSize * 1.2,
          params: {
            access_token: params.access_token
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
          let headers = lastRequest.getHeaders()
          if (params.user_token) {
            headers['Authorization'] = 'Bearer ' + params.user_token
          }
          axios({
            url: 'https://vfos-datahub.ascora.de/v1/products/' + productId + '/programversions',
            method: 'post',
            data: lastRequest,
            // keepAlive pools and reuses TCP connections, so it's faster
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
            headers: headers,
            maxContentLength: chunkSize * 1.2,
            params: {
              access_token: params.access_token
            },
            onUploadProgress: (event) => {
              console.log(event)
            }
          }).then((response) => {
            console.log('Last chunk, successfully uploaded.')
            if (response && response.data) {
              console.log(JSON.stringify(response.data))
            }
          }).catch((error) => {
            console.log(error)
            if (error.response && error.response.data) {
              console.log(JSON.stringify(error.response.data))
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
}).catch(function (error) {
  console.log(error)
})
