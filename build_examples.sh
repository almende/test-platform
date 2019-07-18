#!/usr/bin/env bash

npm install
./vf-os.sh dev

cd assetA
docker build . -t asset-a

cd ../assetB
docker build . -t asset-b

cd ../assetC
docker build . -t asset-c

cd ../
mkdir -p ./testImages
cd ./testImages

../label2manifest.js asset-a true
docker image rm asset-a
docker image rm localhost:5000/asset-a

../label2manifest.js asset-b true
docker image rm asset-b
docker image rm localhost:5000/asset-b

../label2manifest.js asset-c true
docker image rm asset-c
docker image rm localhost:5000/asset-c

cd ../testImages
../manifest2label.js asset-a.zip true true
../manifest2label.js asset-b.zip true true
../manifest2label.js asset-c.zip true true

cd ../
./installAsset.js localhost:5000/asset-b AssetB false
./installAsset.js localhost:5000/asset-a AssetA false
./installAsset.js localhost:5000/asset-c AssetC false

cd esp_storage
docker build . -t esp_webdav_storage
cd ../
./installAsset.js esp_webdav_storage esp_webdav_storage false

cd esp_steelBar
docker build . -t esp_steelbar
cd ../
./installAsset.js esp_steelbar esp_steelbar false

cd mqtt_amqp_bridge
docker build . -t mqtt_amqp_bridge
cd ../
./installAsset.js mqtt_amqp_bridge mqtt_amqp_bridge false

./stop.sh
