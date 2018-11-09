#!/bin/bash


set -e
#set -o xtrace

rm -rf vfosPlatform
rm -rf vfosPlatform.zip

mkdir -p vfosPlatform/tools
mkdir -p vfosPlatform/.persist

cp vf-os.sh vfosPlatform/
cp stop.sh vfosPlatform/
cp start.sh vfosPlatform/

cp label2manifest.js vfosPlatform/tools/
cp installAsset.js vfosPlatform/tools/
cp package.json vfosPlatform/tools/

cp -r ./.persist/registry_persist vfosPlatform/.persist/
cp -r ./testImages vfosPlatform/

zip -8r vfosPlatform.zip vfosPlatform/*
zip -8r vfosPlatform.zip vfosPlatform/.persist/registry_persist

rm -rf vfosPlatform
