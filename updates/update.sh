#!/bin/bash

cd ~/platform/aim/
HOST=$1

sed -i vf-OS-realm.json -re "s/([0-9]*\*?.vfos-hackaton.almende.com)/$HOST/"

docker build . -t vfos/aim
docker tag vfos/aim localhost:5000/vfos/aim
docker push localhost:5000/vfos/aim

cd ..
./stop.sh
rm -rf .persist/aim_persist
./start.sh
