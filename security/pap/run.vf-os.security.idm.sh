#!/bin/bash
docker run --publish 3000:3000/tcp --publish 4430:443/tcp  vf-os-idm  --env-file ./papEnvFile.txt
