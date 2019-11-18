#!/usr/bin/env bash

npm install
./vf-os.sh dev

cd executionManager
cp ../installAsset.js ./
cp ../dump_info.sh ./
rm -rf node_modules
docker build . -t vfos/exec-manager
docker tag vfos/exec-manager localhost:5000/vfos/exec-manager
docker push localhost:5000/vfos/exec-manager

cd ../testServer
rm -rf node_modules
docker build . -t vfos/test-server
docker tag vfos/test-server localhost:5000/vfos/test-server
docker push localhost:5000/vfos/test-server

cd ../deployment
cp ../manifest2label.js ./
rm -rf node_modules
docker build . -t vfos/deploy
docker tag vfos/deploy localhost:5000/vfos/deploy
docker push localhost:5000/vfos/deploy

cd ../packaging
cp ../label2manifest.js ./
cp ../uploader.js ./
cp ../installAsset.js ./
cp ../dumpLabels.js ./
rm -rf node_modules
docker build . -t vfos/packaging
docker tag vfos/packaging localhost:5000/vfos/packaging
docker push localhost:5000/vfos/packaging

cd ../portal
rm -rf node_modules
docker build . -t vfos/portal
docker tag vfos/portal localhost:5000/vfos/portal
docker push localhost:5000/vfos/portal

cd ../systemDashboard
rm -rf node_modules
docker build . -t vfos/system-dashboard
docker tag vfos/system-dashboard localhost:5000/vfos/system-dashboard
docker push localhost:5000/vfos/system-dashboard

cd ../aim
docker build . -t vfos/aim
docker tag vfos/aim localhost:5000/vfos/aim
docker push localhost:5000/vfos/aim

cd ../pubsub
if [[ -d broker-auth-adapter ]]; then
    cd broker-auth-adapter
    git pull -qf
else
    git clone https://git-gris.uninova.pt/vfos/broker-auth-adapter.git/
    cd broker-auth-adapter
fi
#Run npm install before build to prevent timeout
npm install
docker build . -t vfos/broker-auth-adapter
docker tag vfos/broker-auth-adapter localhost:5000/vfos/broker-auth-adapter
docker push localhost:5000/vfos/broker-auth-adapter
cd ..

docker build . -t vfos/messaging
docker tag vfos/messaging localhost:5000/vfos/messaging
docker push localhost:5000/vfos/messaging

cd ../enablersframework
docker build . -t vfos/enablersframework
docker tag vfos/enablersframework localhost:5000/vfos/enablersframework
docker push localhost:5000/vfos/enablersframework

cd ../security
cd pap
docker build . -t vfos/idm
docker tag vfos/idm localhost:5000/vfos/idm
docker push localhost:5000/vfos/idm

cd ../pep
docker build . -t vfos/pep
docker tag vfos/pep localhost:5000/vfos/pep
docker push localhost:5000/vfos/pep
cd ..

cd ..
./installAsset.js localhost:5000/vfos/messaging messaging false
./installAsset.js localhost:5000/vfos/enablersframework enablersframework false
./assignNetwork.js
./stop.sh
