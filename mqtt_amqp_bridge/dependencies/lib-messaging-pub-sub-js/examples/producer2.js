#!/usr/bin/env node
const vfosMessagingPubsub = require("../index.js");

var broker = "amqp://admin1:vfos@localhost";
var userName = "producer2";
var platformDomain = "pt.vfos";
var routingKeys = ["platform"];
var communications = new vfosMessagingPubsub(broker, userName, platformDomain, routingKeys);

let pubSubDestination1 = "pt.vfos.vapp";
let pubSubMessage1 = "Number of machines on Component2 : " + 555;
communications.sendPublication(pubSubDestination1, pubSubMessage1);

let prefixMessagingPrivateDestination = "pt.vfos";
let componentMessagingPrivateDestination = "producer1";
let privateMessage = "This will only be received by producer1 with private informations";
communications.sendPrivateMessage(prefixMessagingPrivateDestination, componentMessagingPrivateDestination, privateMessage);

communications.registerPublicationReceiver();
communications.registerPrivateMessageReceiver();
