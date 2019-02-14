FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9001

LABEL vf-OS=true
LABEL vf-OS.author="AuthorName"
LABEL vf-OS.name="AssetA"
LABEL vf-OS.description="Description of Asset A"
LABEL vf-OS.dependencies="[{\"productID\":142, \"major\":\"123\"}]"


LABEL vf-OS.iconHDUri="img/small_icon.png"
LABEL vf-OS.depends=asset-b
LABEL vf-OS.securityEndpoints="{}"
LABEL vf-OS.compose.0.socket="true"
LABEL vf-OS.compose.0.volume.0="/temp"
LABEL vf-OS.compose.0.volume.1="/temp2"
LABEL vf-OS.compose.0.volume.2="/temp3"
LABEL vf-OS.compose.0.volume.shared.CONFIG="/config"
LABEL vf-OS.compose.0.volume.shared.CONFIG2="/config2"
LABEL vf-OS.compose.0.environment.TEST="true"
LABEL vf-OS.compose.0.environment.OTHER="true"
LABEL vf-OS.compose.0.depends_on.0="registry"

CMD ["npm", "start"]
