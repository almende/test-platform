FROM top20/node:8-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . .

EXPOSE 9000
LABEL vf-OS=true
LABEL vf-OS.name="vf-OS_MQTT_AMQP_Bridge"
LABEL vf-OS.configurationUri="/vf-OS_MQTT_AMQP_Bridge/"
LABEL vf-OS.restUri="/vf-OS_MQTT_AMQP_Bridge/rest/"

LABEL vf-OS.compose.0.volume.0="/persist"
LABEL vf-OS.compose.0.depends_on.0="rabbitmq"

CMD ["npm", "start"]
