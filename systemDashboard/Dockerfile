FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .
RUN npm config set unsafe-perm true

EXPOSE 9000
CMD ["npm", "start"]

LABEL vf-OS=true
LABEL vf-OS-platform=true