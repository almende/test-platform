#!/usr/bin/env node
const vfosMessagingPubsub = require("../index.js");

var broker = "amqp://admin1:vfos@localhost";
var userName = "producer1";
var platformDomain = "pt.vfos";
var routingKeys = ["platform"];
var communications = new vfosMessagingPubsub(broker, userName, platformDomain, routingKeys);

let pubSubDestination1 = "pt.vfos.vapp";
let pubSubMessage1 = "Number of machines on Component1 : " + 1000;
communications.sendPublication(pubSubDestination1, pubSubMessage1);

let prefixMessagingPrivateDestination1 = "pt.vfos";
let componentMessagingPrivateDestination1 = "producer2";
let privateMessage1 = "This will only be received by producer2";
communications.sendPrivateMessage(prefixMessagingPrivateDestination1, componentMessagingPrivateDestination1, privateMessage1);

let pubSubDestination2 = "pt.vfos.logs.critical";
let pubSubMessage2 = "Critical message example";
communications.sendPublication(pubSubDestination2, pubSubMessage2);

let prefixMessagingPrivateDestination2 = "pt.vfos";
let componentMessagingPrivateDestination2 = "vapp1";
let privateMessage2 = "This will only be received by vapp1";
communications.sendPrivateMessage(prefixMessagingPrivateDestination2, componentMessagingPrivateDestination2, privateMessage2);

communications.registerPublicationReceiver();
communications.registerPrivateMessageReceiver();
