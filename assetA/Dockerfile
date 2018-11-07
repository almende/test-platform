FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9001
LABEL vf-OS=true
LABEL vf-OS.depends=asset-b


LABEL vf-OS.author="AuthorName"
LABEL vf-OS.name="AssetA"
LABEL vf-OS.securityEndpoints="securityStuffJSON"

LABEL vf-OS.iconHDUri="img/small_icon.png"
LABEL vf-OS.description="Description of Asset A"

LABEL vf-OS.compose.0.socket="true"

CMD ["npm", "start"]
