FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .
RUN npm config set unsafe-perm true

EXPOSE 9000
LABEL vf-OS=true
LABEL vf-OS.name="AssetB"
LABEL vf-OS.testUri="/AssetB/"

CMD ["npm", "start"]

