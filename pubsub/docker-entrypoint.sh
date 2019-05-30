#!/bin/sh

cat ./vfos_messaging_pubsub_config.config > /config/config
cat ./vfos_messaging_pubsub_plugins.config > /config/plugins
cat ./vfos_messaging_pubsub_definitions.json > /config/definitions

exec /usr/bin/dumb-init -c "$@"
