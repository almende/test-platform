docker build . -t mqtt_amqp_bridge
docker run --rm -v `pwd`/persist/:/persist/ --network="host" --name mqtt_amqp_bridge mqtt_amqp_bridge
