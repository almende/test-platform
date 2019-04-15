ARG NODE_VERSION=8.15.0-slim
FROM node:${NODE_VERSION}

LABEL vf-OS=true
LABEL vf-OS.name=PEP
LABEL vf-OS.author=jlflores@ikerlan.es

ARG GITHUB_ACCOUNT=ging
ARG GITHUB_REPOSITORY=fiware-pep-proxy
ARG DOWNLOAD_TYPE=latest

# Automated Docker file for Docker Hub
# This will retrieve the source code of the latest tagged release from GitHub

MAINTAINER vf-OS

WORKDIR /opt

ENV GITHUB_ACCOUNT=${GITHUB_ACCOUNT}
ENV GITHUB_REPOSITORY=${GITHUB_REPOSITORY}

ENV PEP_PROXY_HTTPS_ENABLED="true" \
    PEP_PROXY_HTTPS_PORT="1443" \
    PEP_PROXY_IDM_HOST="localhost" \ 
    PEP_PROXY_IDM_PORT="4430" \
    PEP_PROXY_IDM_SSL_ENABLED="true" \
    PEP_PROXY_APP_HOST="www.google.com" \
    PEP_PROXY_APP_PORT="80" \
    PEP_PROXY_APP_ID="MyId" \
    PEP_PROXY_USERNAME="myUsername" \
    PEP_PASSWORD="myPassword" \
    PEP_PROXY_PDP="idm"

WORKDIR /

#
# The following line retrieves the latest source code from GitHub.
# 
# To obtain the latest stable release run this Docker file with the parameters
# --no-cache --build-arg DOWNLOAD_TYPE=stable
#
# Alternatively for local development, just copy this Dockerfile into file the
# root of the repository and copy over your local source using : 
#
# COPY . /opt/fiware-pep-proxy
#
RUN if [ ${DOWNLOAD_TYPE} = "latest" ] ; then RELEASE="master"; else RELEASE=$(curl -s https://api.github.com/repos/"${GITHUB_ACCOUNT}"/"${GITHUB_REPOSITORY}"/releases/latest | grep 'tag_name' | cut -d\" -f4); fi && \
    if [ ${DOWNLOAD_TYPE} = "latest" ] ; then echo "INFO: Building Latest Development"; else echo "INFO: Building Release: ${RELEASE}"; fi && \
  	apt-get update && \
  	apt-get install -y  --no-install-recommends unzip && \
  	curl https://github.com/"${GITHUB_ACCOUNT}"/"${GITHUB_REPOSITORY}"/archive/"${RELEASE}".zip -L -s -o source.zip  && \
  	unzip source.zip && \
	rm source.zip && \
	mv "${GITHUB_REPOSITORY}"-"${RELEASE}" /opt/fiware-pep-proxy && \
	rm -rf "${GITHUB_REPOSITORY}"-"${RELEASE}" && \
	apt-get clean && \
	apt-get remove -y unzip && \
    apt-get -y autoremove



# For local development, when running the Dockerfile from the root of the repository
# use the following commands to configure Keyrock, the database and add an entrypoint:
# 
# COPY extras/docker/config.js.template  /opt/fiware-pep-proxy/config.js

# Copy config file from the same Directory.
COPY config.js.template /opt/fiware-pep-proxy/config.js

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy

RUN mkdir certs && \
    openssl genrsa -out pep-2018-key.pem 2048 && \
    openssl req -new -sha256 -key pep-2018-key.pem -out pep-2018-csr.pem -batch && \
    openssl x509 -req -in pep-2018-csr.pem -signkey pep-2018-key.pem -out pep-2018-cert.pem && \
    mv pep-2018-key.pem pep-2018-cert.pem pep-2018-csr.pem certs/


RUN apt-get install -y  --no-install-recommends make gcc g++ python && \
	npm install --production --silent && \
	rm -rf /root/.npm/cache/* && \
	apt-get clean && \
	apt-get remove -y make gcc g++ python  && \
	apt-get -y autoremove

# Ports used by idm
EXPOSE ${PEP_PROXY_PORT:-1027}

CMD ["npm", "start" ]
