#!/usr/bin/env node

amqp = require('amqplib');

/*
 * Debug mode
 *
 * Enable the logging of messages to the console
 * Disable in production!
 */
const DEBUG = true;

/*
 * Logging function
 */
function logDebug(msg){
  if(!DEBUG){
    return;
  }

  let logMsg = "vfosMessagingPubsub logs: " + msg;
  console.log(logMsg);
}

/*
 * Error loggin function
 */
function errLog(msg){
  if(!DEBUG){
    return;
  }

  let timestamp = Date(Date.now());
  let errLogMsg = timestamp + ": vfosMessagingPubsub ERROR: " + msg;
  console.log(errLogMsg);
}

/*
 * Create Channel
 *
 * Use the given connection to create a channel
 */
function createChannel(connection){
  return connection.createChannel()
  .catch(err => errLog(err));
}

/*
 * Connect
 *
 * Receive server address
 * Establish connection and create three channels
 * - To assert configurations in the broker
 * - To send or publishing messages
 * - To receive or consume messages
 */
function connect(commObj, server) {
  return commObj.loginPromise = amqp.connect("amqp://" +  server)
  .then(function(conn){
    process.once('SIGINT', function() {
      logDebug("Closing AMQP connection");
      conn.close();
    });
    let messagingChannel = createChannel(conn);
    let pubsubChannel = createChannel(conn);
    let announcementChannel = createChannel(conn);
    return Promise.all([messagingChannel, pubsubChannel, announcementChannel])
    .then(function([ mCh, pCh, aCh ]){
      commObj.messagingChannel = mCh;
      commObj.pubsubChannel = pCh;
      commObj.announcementChannel = aCh;

      commObj.messagingChannel.on('error', function (err) {
        errLog('MessagingChannel closed due to error. ' + err);
      });

      commObj.pubsubChannel.on('error', function (err) {
        errLog('pubsubChannel channel Closed due to error. ' + err);
      });

      commObj.announcementChannel.on('error', function (err) {
        errLog('AnnouncementChannel channel Closed due to error. ' + err);
      });

      //they cannot be "checkExchange" because if they are not available, the channel will be closed and it won't be possible to use the other communication channel
      let checkMessagingExchange = commObj.messagingExchangePromise = commObj.messagingChannel.assertExchange(commObj.messagingExchange, 'topic', {durable: true})
      .catch(function(err){
        return Promise.reject("Message Exchange " + commObj.messagingExchange + " not available. " + err);
      });

      let checkPubsubExchange = commObj.pubSubExchangePromise  = commObj.pubsubChannel.assertExchange(commObj.pubsubExchange, 'topic', {durable: true})
      .catch(function(err){
        return Promise.reject("PubSub Exchange " + commObj.pubsubExchange + " not available. : " + err);
      });

      let checkAnnouncementExchange = commObj.announcementExchangePromise  = commObj.announcementChannel.assertExchange(commObj.pubsubExchange, 'topic', {durable: true})
      .catch(function(err){
        return Promise.reject("PubSub Exchange for Announcements " + commObj.pubsubExchange + " not available. : " + err);
      });

      return Promise.all([checkMessagingExchange.catch(e => e), checkPubsubExchange.catch(e => e), checkAnnouncementExchange.catch(e => e)])
      .catch(() => Promise.resolve());
    })
  })
  .catch(function(err){
    return Promise.reject("Connection not available. " + err);
  });
}

/*
 * Disconnect
 *
 * Close connection to AMQP server
 */
function disconnect(connection){
  logMsg("Closing AMQP connection");
  connection.close();
}

/*
 * Send message
 *
 * Generic send message method to be used by both Messaging and PubSub
 * Sends message with given content to a key
 * username should be the same as the class' this.name
 */
function sendMessage(commObj, channel, exchange, key, content){
  let timestamp = Date.now();
  return commObj.registerPromise
  .then(() => channel.publish(exchange, key, Buffer.from(content), {appId: commObj.username, timestamp: timestamp}))
  .then(function(){
    logDebug("Sent Message as " + commObj.username + " using " + exchange +  " on " + key + " at " + timestamp + ": " + content.toString());
    return Promise.resolve();
  });
    //TODO: Replace appId with userId once the broker starts handling authentication
}

/*
 * Register a message receiver
 *
 * Generic method to be used by both Messaging and PubSub to retrieve messages
 * Calls for the creation of the message handler function
 * Consumes messages from the queue if registration has been successful
 */
function registerMessageReceiver(commObj, channel, queue, receiverType){
  return commObj.registerPromise
  .then(function(){
    messageHandler = createMessageHandler(commObj);
    return channel.consume(queue, messageHandler, commObj.consumeRules)
    .then(function(){
      console.log("entered in registerMessageReceiver");
      return Promise.resolve();
    })
    .catch(function(err){
      console.log("error on registerMessageReceiver");
      return Promise.reject();
    });
  })
  .catch(function(){
    return Promise.reject("Cannot consume messages because " + receiverType + " is not available.");
  });
}

/*
 * Create Message Handler
 *
 * Creates an anonymous function that will be delivered as callback to amqplib.consume
 * which includes references to processMessage and the instance's messageHandlerCallback
 */
function createMessageHandler(commObj){
  return function(msg){
    processedMessage = processMessage(msg);
    commObj.messageHandlerCallback(processedMessage);
  };
}

/*
 * Bind queue with a single key
 *
 * Bind a queue to an exchange with a single key
 */
function bindQueueKey(commObj, channel, queue, exchange, key){
  return commObj.loginPromise
  .then(() => channel.bindQueue(queue, exchange, key))
  .then(() => Promise.resolve(logDebug("Bound queue named <" + queue + "> to exchange named <" + exchange + "> with routingkey named <" + key + ">.")))
  .catch((err) => Promise.reject("Queue not binded. " + err));
}

/*
 * Bind queue with multiple keys
 *
 * Iterate through an array of keys and bind the queue to the exchange
 * using every single one of them
 */
function bindQueueMultipleKeys(commObj, channel, queue, exchange, keys){
  return Promise.all(keys.map(function(singleKey){
    return bindQueueKey(commObj, channel, queue, exchange, singleKey);
  }))
  .catch((err) => Promise.reject("Queue not binded with routingkeys " + keys + ". " + err));
}

/*
 * Generate Private key
 *
 * Given the username and prefix, generate a private key string
 */
function generatePrivateKey(prefix, username){
  return prefix + '.' + 'component' + '.' + username;
}

/*
 * Process Message
 *
 * Given an AMQP message object, return it in an abridged format
 * Fields:
 *  `- routingKey: String with the routing key of the message
 *  `- id: ID of the sender
 *  `- content: Content of the message
 *  `- timestamp: Unix time of sending
 *  `- length: Length of the message
 */
function processMessage(msg){
  let outputMessage = {};

  if (!msg){
    errLog("No message to process.");
    return;
  }

  outputMessage.routingKey = msg.fields.routingKey;
  outputMessage.id = msg.properties.appId;
  outputMessage.content = msg.content;
  outputMessage.timestamp = msg.properties.timestamp;
  outputMessage.length = msg.content.length;

  return outputMessage;
}

/*
 *
 * vfosMessagingPubsub Class
 *
 */
class vfosMessagingPubsub{

  /*
   * Class constructor
   *
   * Assign default variables and configs
   * Login
   * Register
   */
  constructor(server='localhost', username='guest', password='guest', keys=["#"]){
    this.username = username;
    this.server = server;
    this.prefix = "eu.vfos";

    // Exchange names
    this.messagingExchange = 'messaging';
    this.pubsubExchange = 'pubsub';

    // Queue names
    this.messagingQueue = this.username + '_messaging';
    this.pubsubQueue = this.username + '_pubsub';

    // Queue rules
    this.messagingQueueRules = {durable: true};
    this.pubsubQueueRules = {durable: true};

    // Consume rules
    this.consumeRules = {noAck: true};

    // Channel pointers
    var messagingChannel, pubsubChannel, announcementChannel;

    // Login and register automatically when creating an instance
    Promise.all([this.login(this.username, password).catch(e => e), this.register(keys).catch(e => e), this.messageRegistration().catch(e => e), this.pubSubRegistration(keys).catch(e => e)])
    .catch(function(err){
      errLog(err);
    })
  }

  messageRegistration(){
    let commObj = this;
    return this.messagePromise = commObj.loginPromise
    .then(() => commObj.messagingExchangePromise)
    .then(() => commObj.messagingChannel.assertQueue(commObj.messagingQueue, commObj.messagingQueueRules))
    .then(() => bindQueueKey(commObj, commObj.messagingChannel, commObj.messagingQueue, commObj.messagingExchange, generatePrivateKey(commObj.prefix, commObj.username)))
    .catch(function(err){
      return Promise.reject("Error on messaging registration. " + err);
    });;
  }

  pubSubRegistration(keys){
    let commObj = this;
    return this.pubSubPromise = commObj.loginPromise
    .then(() => commObj.pubSubExchangePromise)
    .then(() => commObj.pubsubChannel.assertQueue(commObj.pubsubQueue, commObj.pubsubQueueRules))
    .then(() => bindQueueMultipleKeys(commObj, commObj.pubsubChannel, commObj.pubsubQueue, commObj.pubsubExchange, keys))
    .catch(function(err){
      return Promise.reject("Error on PubSub registration. " + err);
    });;
  }

  /*
   * Log into the Messaging/PubSub system
   *
   * Connect to the broker
   * Create one input and one output channels
   * Send a notification to the system
   */
  login(username, password){
    let commObj = this;
    return connect(commObj, username+":"+password+"@"+this.server)
    .then(function(){
      logDebug("Logged in to the Messaging/PubSub system as " + commObj.username);
      commObj.sendPublicationAnnouncement("login", "");
      return Promise.resolve();
    })
    .catch(function(err){    
      return Promise.reject("Error while login. " + err);
    });
  }

  /*
   * Log out of the Messaging/PubSub system
   *
   * Send a notification to the system
   * Remove both channels
   * Disconnect from the broker
   */
  logout(){
    let commObj = this;

    return commObj.loginPromise
    .then(function(){
      let logoutAnnouncementProm = commObj.sendPublicationAnnouncement("logout");
      let messagingChannelCloseProm = commObj.messagingChannel.close();
      let pubsubChannelCloseProm = commObj.pubsubChannel.close();

      return Promise.all([logoutAnnouncementProm, messagingChannelCloseProm, pubsubChannelCloseProm])
      .then(function(){
	      logDebug("Logged out to the Messaging/PubSub system");
	      return disconnect(this.connection);
      });
    });
  }

  /*
   * Register on the Messaging/PubSub system
   *
   * Create two queues, one for Messaging and another for PubSub
   * Bind the Messaging queue with the module name
   * Bind the PubSub queue with the routing keys
   * Send a notification to the system
   */
  register(keys){
    let commObj = this;

    return this.registerPromise = commObj.loginPromise
    .then(function(){
      return Promise.all([commObj.messagePromise.catch(e => e), commObj.pubSubPromise.catch(e => e)])
      .catch(() => Promise.resolve());
    })
    .then(function(){
      logDebug("Registered in the Messaging/PubSub system as " + commObj.username);
      commObj.sendPublicationAnnouncement("register", "");
      return Promise.resolve();
    })
    .catch(function(err){
      return Promise.reject("Error while register. " + err);
    });
  }

  /*
   * Unregister from the Messaging/PubSub system
   *
   * Send a notification to the system
   * Remove both Messaging and PubSub queues from the broker
   */
  unregister(){
    let commObj = this;

    return commObj.registerPromise
    .then(function(){
      let messagingProm = commObj.messagingChannel.deleteQueue(commObj.messagingQueue);
      let pubSubProm = commObj.pubsubChannel.deleteQueue(commObj.pubsubQueue);

      return Promise.all([messagingProm, pubSubProm])
      .then(function(){
	      logDebug("Unregistered from the Messaging/PubSub system");
	      return commObj.sendPublicationAnnouncement("unregister");
      });
    });
  }

  /*
   * Change Subscriptions
   *
   * Rebind the PubSub queue with the given routing keys
   */
  changeSub(keys){
    let commObj = this;

    bindQueueMultipleKeys(commObj, this.pubsubChannel, this.pubsubQueue, this.pubsubExchange, keys);
    logDebug("Changed PubSub routing keys to: " + keys);
  }

  /*
   * Send Message
   *
   * Send a private message to a destination on a certain prefix
   */
  sendPrivateMessage(prefix, dest, content){
    let commObj = this;
    return commObj.messagePromise
    .then(() => sendMessage(commObj, commObj.messagingChannel, commObj.messagingExchange, generatePrivateKey(prefix, dest), content))
    .catch(function(err){
      errLog("sendPrivateMessage function not available. "  + err);
      return Promise.reject(err);
    });;
  }

  /*
   * Send Publication through announcementChannel
   *
   * Publish a message with the given key
   */
  sendPublication(key, content){
    let commObj = this;
    return commObj.registerPromise
    .then(() => commObj.announcementExchangePromise)
    .then(() => sendMessage(commObj, commObj.announcementChannel, commObj.pubsubExchange, key, content))
    .catch(function(err){
      errLog("sendPublication function not available. "  + err);
      return Promise.reject(err);
    });;
  }

  /*
   * Send announcement message
   *
   * Publish a message in the announcement key
   */
  sendPublicationAnnouncement(type, content=""){
    let announcementKey = this.prefix + '.announcements.' + type;
    let announcementMessage;

    switch (type){
      case "login": announcementMessage = this.username + " has logged in";
        break;
      case "logout": announcementMessage = this.username + " has logged out";
        break;
      case "register": announcementMessage = this.username + " has registered";
        break;
      case "unregister": announcementMessage = this.username + " has unregistered";
        break;
    }
    return this.sendPublication(announcementKey, announcementMessage)
    .catch(err => errLog("sendPublicationAnnouncement function not available. "  + err));
  }

  /*
   * Register a private message receiver
   *
   * Launches a private message receiver with a callback to handle incoming messages
   */
  registerPrivateMessageReceiver(callback){
    let commObj = this;
    this.messageHandlerCallback = callback;

    return commObj.messagePromise
    .then(() => registerMessageReceiver(this, this.messagingChannel ,this.messagingQueue, "Message Receiver"))
    .catch(function(err){
      errLog("registerPrivateMessageReceiver function not available. "  + err);
      return Promise.reject(err);
    });;
  }

  /*
   * Register a publication receiver
   *
   * Launches a publication receiver with a callback to handle incoming messages
   */
  registerPublicationReceiver(callback){
    let commObj = this;
    this.messageHandlerCallback = callback;

    return commObj.pubSubPromise
    .then(() => registerMessageReceiver(this, this.pubsubChannel, this.pubsubQueue, "PubSub Receiver"))
    .catch(function(err){
      errLog("registerPublicationReceiver function not available. "  + err);
      return Promise.reject(err);
    });
  }

}

module.exports = vfosMessagingPubsub;
