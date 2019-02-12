#!/bin/sh

cat ./vfos_messaging_pubsub_config.config > /config/vfos_messaging_pubsub_config.config
cat ./vfos_messaging_pubsub_plugins.config > /config/vfos_messaging_pubsub_plugins.config


exec /usr/bin/dumb-init -c "$@"
