#!/usr/bin/env node
'use strict'

const exec = require('child_process').exec
const fs = require('fs')

const COMPOSE_FOLDER = process.argv[2] ? process.argv[2] : '.compose/'
const NETWORK_COMPOSE_FILE = process.argv[3] ? process.argv[3] : '1_networks_compose.yml'
const reload = process.argv[4] ? JSON.parse(process.argv[4]) : false

let networks = ['default', 'execution-manager-net', 'system-dashboard-net', 'ef_efn'];
let top = 5 // Determine top based on amount of assets
let services = {}

// Get amount of assets, based on file list length, minus the three meta files
let count = 0
fs.readdirSync(COMPOSE_FOLDER).forEach(file => {
  if (file.startsWith('3_')) {
    let filestr = fs.readFileSync(COMPOSE_FOLDER + file, { 'encoding': 'utf-8' })
    filestr.split('\n').forEach(line => {
      if (line.match(/ [^{]*:$/g)) {
        services[line.trim().replace(':', '')] = { 'networks': ['asset-net-' + count] }
      }
    })
    count++
  }
})
if (count > top) {
  top = count // Make sure we have enough networks at all time
}

for (let i = 0; i < top; i++) {
  networks.push('asset-net-' + i)
}

// apply network to config files?

services['reverse-proxy'] = { 'networks': networks }
if (services['rabbitmq']) {
  services['rabbitmq'] = { 'networks': networks, 'ports': ['1883:1883','5672:5672'] }
}

if (services['efrequesthandler']){
  services['efrequesthandler'].networks.push('ef_efn');
}

let networkSection = {}
let counter = 0
networks.map((network) => {
  if (network !== 'default') {
    networkSection[network] = {
      'driver': 'bridge',
      'ipam': { 'config': [{ 'subnet': '10.99.' + (counter++) + '.0/24' }] }
    }
  }
  
  if (network === 'ef_efn') {
    networkSection[network].driver = 'overlay';
  }
})

// Generate docker-compose file for this asset into folder
fs.writeFileSync(COMPOSE_FOLDER + NETWORK_COMPOSE_FILE, 'version: "3.4"\nservices:\n   ' + JSON.stringify(services) + '\n\nnetworks:\n   ' + JSON.stringify(networkSection))
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
