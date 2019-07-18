# lib-messaging-pub-sub-js

JavaScript library to simplify the use of [amqplib](https://github.com/squaremo/amqp.node) and RabbitMQ.



# AMQP & RabbitMQ

The message broker has a loosely coupled architecture, which allows the components of the system to use the name rather than their location/address. This can only be possible because the broker (RabbitMQ) does all the messaging management. It receives the messages produced by the producers/publishers and will deliver them to the consumers or another broker.
In vfOS project, the message broker will use Advanced Message Queuing Protocol (AMQP), that is an open standard that defines a protocol for components to exchange messages. It is a specification that defines the semantics of an interoperable messaging protocol [1].
In [1] you can find a comparison between AMQP and other message protocols.

* Broker installation
The docker compose uses functionalities that require the Broker to be deployed into a swarm.
Inside the docker-compose folder run the script:
docker stack deploy --compose-file docker-compose.yml rabbitmq

* File locations

│ node           : rabbit@02ee72e2d91d
│ home dir       : /var/lib/rabbitmq
│ config file(s) : /etc/rabbitmq/rabbitmq.conf
│ cookie hash    : mhyXR2KVaxqoFFCCKR907g==
│ log(s)         : <stdout>
│ database dir   : /var/lib/rabbitmq/mnesia/rabbit@02ee72e2d91d

* RabbitMQ Info - Through rabbitmqctl plugin
Config File location: /etc/rabbitmq/rabbitmq.conf

    * List users - shows all registered users and their tags 
    
    rabbitmqctl list_users

    * Add user - adds one user (without management tag)
    
    rabbitmqctl add_user user_name password

    * Set user tags - defined the management role

    rabbitmqctl set_user_tags user_name management_tag

    * Set permissions

    rabbitmqctl set_permissions -p /host_name user_name “^tonyg-.*” “.*” “.*”

    * List permissions

    rabbitmqctl list_permissions -p /host_name

* ConfigFileStructure: vfos_messaging_pubsub_config.conf
loopback_users.guest = false
listeners.tcp.default = 5672
hipe_compile = false
management.listener.port = 15672
management.listener.ssl = false
auth_http.user_path = http://10.172.67.171:8080/auth/user
auth_http.vhost_path = http://10.172.67.171:8080/auth/vhost
auth_http.resource_path = http://10.172.67.171:8080/auth/resource
auth_http.topic_path = http://10.172.67.171:8080/auth/topic

# vfosMessagingPubsub


## Install

In this library's folder run

```
npm install
```


## Import

```
vfosMessagingPubsub = require('lib-messaging-pub-sub-js');
```


## Initialize

```
communicationObject = new vfosMessagingPubsub("amqp://broker.address.com", "username", "vfos.prefix", ["example.key.*", "example.anotherkey.logs"]);
```

Login and Registry happen automatically on initialization


## Avaliable Methods

Upon initializing a vfosMessagingPubsub object, the following methods become avaliable for use

Each of these methods return a promise


### login()

Connect to the messaging system


### logout()

Disconnect from the messaging system


### register(keys)

Register on the messaging system, create our queues and subscribe to topic `keys` (string array)

After registering, messages messages will be saved even if the user is offline


### unregister()

Unregister from the messaging system and delete our queues


### changeSub(keys)

Change the PubSub subscriptions to topic `keys` (string array)


### sendPrivateMessage(prefix, dest, content)

Send a private message to a component `dest` (string) in a location `prefix` (string)  with `content` (multitype)


### sendPublication(key, content)

Publish a message on a topic `key` (string)  with `content` (multitype)


### registerPrivateMessageReceiver(callback)

Check our messaging queue for private messages

Provide a `callback` (function) for handling each retrieved message object


### registerPublicationReceiver(callback)

Check our PubSub queue for public messages

Provide a `callback` (function) for handling each retrieved message object


## Message object

Received messages are resolved in the following format

element    | type   | description
-----------|--------|-------------
routingKey | string | String with the routing key of the message
id         | string | Identification of the sender
content    | blob   | Content of the message
timestamp  | number | Unix time of sending
length     | number | Length of the message


*Each of these functions returns a promise that will resolve if its execution is successful or get rejected otherwise*


## Examples

Examples are avaliable in `examples/`



# References
[1] - RabbitMQ
