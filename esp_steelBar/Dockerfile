FROM top20/node:8-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .

EXPOSE 9001
LABEL vf-OS=true
LABEL vf-OS.name="vf-OS_external_steelbar_service_client"
LABEL vf-OS.configurationUri="/vf-OS_external_steelbar_service_client/"
LABEL vf-OS.restUri="/vf-OS_external_steelbar_service_client/steelbar/"

LABEL vf-OS.compose.0.volume.0="/persist"


CMD ["npm", "start"]
