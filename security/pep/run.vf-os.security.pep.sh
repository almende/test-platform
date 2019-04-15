#!/bin/bash
docker run --publish 10270:1027/tcp --env PEP_PROXY_HTTPS_ENABLED=true --env PEP_PROXY_HTTPS_PORT=1443 --env PEP_PROXY_IDM_PORT=4430 --env PEP_PROXY_IDM_HOST=172.17.0.1 --env PEP_PROXY_IDM_SSL_ENABLED=true --env PEP_PROXY_APP_HOST=www.google.com --env PEP_PROXY_APP_PORT=80 --env PEP_PROXY_USERNAME=myusername --env PEP_PASSWORD=mypassword --env PEP_PROXY_PDP=idm vf-os-pep

