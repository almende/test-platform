#!/usr/bin/env bash

cd assetA
docker build . -t asset-a

cd ../assetB
docker build . -t asset-b

cd ../assetC
docker build . -t asset-c

cd ../executionManager
docker build . -t vfos/exec-manager

cd ../deployment
docker build . -t vfos/deploy

cd ../portal
docker build . -t vfos/portal

cd ../systemDashboard
docker build . -t vfos/system-dashboard

cd ../aim
docker build . -t vfos/aim

cd ../
