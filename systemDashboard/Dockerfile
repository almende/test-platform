FROM top20/node:8-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .

EXPOSE 9000
CMD ["npm", "start"]

LABEL vf-OS=true
LABEL vf-OS-platform=true