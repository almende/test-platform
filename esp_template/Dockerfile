FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9000
LABEL vf-OS=true
LABEL vf-OS.name="vf-OS_external_service_template_client"
LABEL vf-OS.configurationUri="/vf-OS_external_service_template_client/"
LABEL vf-OS.restUri="/vf-OS_external_service_template_client/rest/"

LABEL vf-OS.compose.0.volume.0="/persist"

CMD ["npm", "start"]
