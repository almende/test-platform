#!/bin/sh

for container in `docker ps -qa`; do
  docker inspect $container | jq ' .[] | {id: .Id, name: .Name, labels: .Config.Labels, state: .State }'
done | jq -s .
