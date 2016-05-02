/* @flow */
import libMessage from "./domain/message";

async function onEntry(context, username) {
  sendTextMessage(context, `Type your message to ${username}`);
  context.current.username = username;
}

async function readMessage(context, message, matches) {
  const username = context.current.username;
  const text = matches[0];
  const message = await libMessage.send(context.username, username, text);
  exitTopic(context, message);
}

export default {
  onEntry,
  parsers: [
    defPattern("read-lines", ".*", readMessage)
  ]
}
