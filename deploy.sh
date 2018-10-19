#!/bin/bash


set -e
#set -o xtrace

rm -rf vfosPlatform
mkdir -p vfosPlatform/tools

cp vf-os.sh vfosPlatform/
cp stop.sh vfosPlatform/
cp start.sh vfosPlatform/

cp label2manifest.js vfosPlatform/tools/
cp package.json vfosPlatform/tools/

cp -r ./.registry_persist vfosPlatform/
cp -r ./testImages vfosPlatform/

zip -8r vfosPlatform.zip vfosPlatform/*
zip -8r vfosPlatform.zip vfosPlatform/.registry_persist
