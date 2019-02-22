#!/bin/sh

for container in `docker ps -q`; do 
  docker inspect $container | jq ' .[] | {id: .Id, name: .Name, labels: .Config.Labels }'
done | jq -s .
