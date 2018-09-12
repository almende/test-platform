FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .
RUN mkdir -p downloads

EXPOSE 9000
CMD ["npm", "start"]

LABEL vf-OS=true
LABEL vf-OS-platform=true