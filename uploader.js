#!/usr/bin/env node
'use strict'

const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')
const formData = new FormData()

// console.log ("parameters: "+ process.argv.length)
// for (let param in process.argv){
//     console.log("param"+param+": " + process.argv[param]);
// }
// if (process.argv.length != 6) {
//     console.log('Call this script as "npm run uploader <product_names_en-us> <price_info_eur> <zipfile> <access_token>"');
//     console.log('Example "npm run vfos-upload opc_ua_driver 20.5 opc_ua.zip qSsY5N2RABd5lxoeGiYBsx4Xv5lzmKzqrplg1DghK9k"');
//     process.exit(1);
//   }

const productName = process.argv[2]
const priceInfo = process.argv[3]
const fileName = process.argv[4]
const accessToken = process.argv[5]

if (accessToken === null) {
  console.log('Call this script as "./uploader.js <product_names_en-us> <price_info_eur> <zipfile> <access_token>"')
  console.log('Example "./uploader.js opc_ua_driver 20.5 opc_ua.zip qSsY5N2RABd5lxoeGiYBsx4Xv5lzmKzqrplg1DghK9k"')
  process.exit(1)
}
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

      var stream = fs.createReadStream(fileName, { highWaterMark: 100 * 1024 * 1024 })
      let i = 0
      stream.on('data', function (chunk) {
        let chunkSize = 100 * 1024 * 1024
        var chunks = stat.size / chunkSize
        console.log('ProductID: ' + response.data.data.product.productId)
        console.log('chunk:', chunk.length)
        console.log('current chunk..', i)
        console.log('current chunkSize..', chunkSize)
        // console.log(file.slice(offset,offset+chunkSize));
        formData.append('product_id', response.data.data.product.productId)
//        formData.append('binary_part', i)
//        formData.append('binary_part_max', chunks)
        formData.append('major', '1.0')
        formData.append('version', '1.0')
        formData.append('languages', 'en')

        console.log('Form-data appended.',formData)

        formData.append('binary', chunk, {'contentType':'application/zip','filename':fileName})

        console.log('Binary appended')

        // push it to the server
        axios({
          url: `https://vfos-datahub.ascora.de/v1/products/${response.data.data.product.productId}/programversions`,
          method: 'post',
          data: formData,
          headers: formData.getHeaders(),
          maxContentLength: chunkSize * 1.2,
          params: {
            access_token: accessToken
          },
          onUploadProgress: (event) => {
            console.log(event)
          }
        })
          .then(function (response) {
            console.log('successfully uploaded')
          })
          .catch(function (error) {
            console.log(error,error.response.data)
          })
        i++
      })
    })
  })
  .catch(function (error) {
    console.log(error)
  })
