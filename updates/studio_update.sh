#!/bin/bash
#push new version of packaging.js

cd platform/packaging
sed -i packaging.js -re 's/false \/var\/run\/compose/true \/var\/run\/compose/'

docker build . -t vfos/packaging
docker tag vfos/packaging localhost:5000/vfos/packaging
docker push localhost:5000/vfos/packaging
cd ..

./stop.sh

cd ~
docker load < studio.tar

cd platform
./start.sh
