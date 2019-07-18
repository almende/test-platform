#!/usr/bin/env node
const vfosMessagingPubsub = require("../index.js");

var broker = "amqp://admin1:vfos@localhost";
var userName = "vapp1";
var platformDomain = "pt.vfos";
var routingKeys = ["pt.vfos.vapp", "pilot1"];

var communications = new vfosMessagingPubsub(broker, userName, platformDomain, routingKeys);

let pubSubDestination1 = "vapp";
let pubSubMessage1 = "vApp1 with results 1";

//communications.sendPublication(pubSubDestination1, pubSubMessage1);

communications.registerPublicationReceiver();
communications.registerPrivateMessageReceiver();
