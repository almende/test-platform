#!/usr/bin/env node
const vfosMessagingPubsub = require("../index.js");

var broker = "localhost";
var userName = "archiver@vfos.eu";
var password = "archiverVfOs";
var routingKeys = ["eu.vfos.announcements.#"];

var communications = new vfosMessagingPubsub(broker, userName, password, routingKeys);

function messageHandler(msg) {
  topic = msg.routingKey;

  switch (msg.content.toString()) {
    case "trigger":
      console.log("> messageHandler: TRIGGER SPECIAL MESSAGE");
    break;
    default:
      console.log("> messageHandler: msg.content = \"" + msg.content.toString() + "\"");
    break;
  }
}

communications.sendPublication("eu.vfos.announcements.logs", "*********** Message with logs");

communications.registerPublicationReceiver(messageHandler)
.catch(err => console.log("[CODE] archiver register public message error: " + err));

communications.registerPrivateMessageReceiver(messageHandler)
.catch(err => console.log("CODE] archiver register private message error: " + err));
