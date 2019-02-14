FROM node:alpine

RUN apk update
RUN apk upgrade
RUN apk add docker
RUN rm -rf /var/cache/apk/*

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9000
LABEL vf-OS=true
LABEL vf-OS.name="Packaging service"
LABEL vf-OS.restUri="/rest/"

LABEL vf-OS.compose.0.socket=true

CMD ["npm", "start"]

