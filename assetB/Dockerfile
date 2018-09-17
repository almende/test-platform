FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9000
LABEL vf-OS true

LABEL vf-OS.icon img/2.png

CMD ["npm", "start"]

