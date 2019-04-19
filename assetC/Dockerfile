FROM top20/node:8-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .

EXPOSE 9001
LABEL vf-OS=true
LABEL vf-OS.name="AssetC"
LABEL vf-OS.iconHDUri="img/small_icon.png"
LABEL vf-OS.frontendUri="/AssetC/"
LABEL vf-OS.compose.0.depends_on.0="AssetB"

CMD ["npm", "start"]
