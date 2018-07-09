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
CMD ["npm", "start"]
