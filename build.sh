#!/usr/bin/env bash

cd assetA
docker build . -t asset-a

cd ../assetB
docker build . -t asset-b

cd ../assetC
docker build . -t asset-c

cd ../
mkdir -p ./testImages
cd ./testImages

docker save asset-a -o asset-a
../label2manifest.js asset-a true
docker image rm asset-a
docker image rm localhost:5000/asset-a

docker save asset-b -o asset-b
../label2manifest.js asset-b true
docker image rm asset-b
docker image rm localhost:5000/asset-b

docker save asset-c -o asset-c
../label2manifest.js asset-c true
docker image rm asset-c
docker image rm localhost:5000/asset-c

cd ../executionManager
docker build . -t vfos/exec-manager

cd ../testServer
docker build . -t vfos/test-server

cd ../deployment
docker build . -t vfos/deploy

cd ../portal
docker build . -t vfos/portal

cd ../systemDashboard
docker build . -t vfos/system-dashboard

cd ../aim
docker build . -t vfos/aim

cd ../
