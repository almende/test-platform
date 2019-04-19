FROM top20/node:8-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .

EXPOSE 9000
LABEL vf-OS=true
LABEL vf-OS.name="AssetB"
LABEL vf-OS.testUri="/AssetB/"

CMD ["npm", "start"]

