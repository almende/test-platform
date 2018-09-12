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
../label2manifest.sh asset-a
docker image rm asset-a

docker save asset-b -o asset-b
../label2manifest.sh asset-b
docker image rm asset-b

docker save asset-c -o asset-c
../label2manifest.sh asset-c
docker image rm asset-c

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
