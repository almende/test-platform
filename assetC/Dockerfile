FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9001
LABEL vf-OS true
LABEL vf-OS.depends asset-b
CMD ["npm", "start"]
