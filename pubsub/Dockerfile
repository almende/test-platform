#FROM busybox
FROM node:alpine

LABEL vf-OS=true \
  vf-OS.name="Messaging-PubSub" \
  vf-OS.author="Uninova GRIS" \
  vf-OS.version="0.1.0" \
  vf-OS.description="Messaging and Pub-Sub package components that are responsible for data brokering" \
  vf-OS.dependencies="[]" \
  vf-OS.backendUri="/rabbitmq/" \
  vf-OS.restUri="/rabbitmq/" \
  vf-OS.securityEndpoints="{}" \
  vf-OS.compose.0.volume.shared.rabbitmq_config="/config/vfos_messaging_pubsub_config.config" \
  vf-OS.compose.0.volume.shared.rabbitmq_plugins="/config/vfos_messaging_pubsub_plugins.config" \
  vf-OS.compose.1.serviceName="rabbitmq" \
  vf-OS.compose.1.image="rabbitmq:latest" \
  vf-OS.compose.1.hostname="rabbitmq" \
  vf-OS.compose.1.port=15672 \
  vf-OS.compose.1.volume.shared.rabbitmq_config="/etc/rabbitmq/rabbitmq.conf" \
  vf-OS.compose.1.volume.shared.rabbitmq_plugins="/etc/rabbitmq/enabled_plugins" \
  vf-OS.compose.1.volume.0="/var/lib/rabbitmq" \
  vf-OS.compose.1.depends_on.0="Messaging-PubSub" \
  vf-OS.compose.2.serviceName="broker-auth-adapter" \
  vf-OS.compose.2.image="vfos/broker-auth-adapter" \
  vf-OS.compose.2.depends_on.0="rabbitmq"

COPY docker-entrypoint.sh ./
COPY vfos_messaging_pubsub_config.config ./
COPY vfos_messaging_pubsub_plugins.config ./

RUN apk --no-cache add dumb-init

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["cat","/dev/stdout"]
