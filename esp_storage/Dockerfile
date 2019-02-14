FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9000
LABEL vf-OS=true
LABEL vf-OS.name="vf-OS_external_webdav_service_client"
LABEL vf-OS.configurationUri="/config/"
LABEL vf-OS.restUri="/webdav/

LABEL vf-OS.compose.0.volume.0="/persist"

CMD ["npm", "start"]

