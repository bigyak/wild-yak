/* @flow */
import libMessage from "./domain/message";

async function onEntry(context, username, message) {
  const message = await libMessage.send(context.username, username, message);
  sendTextMessage(context, `Message sent to ${username}`);
  exitTopic(context, message);
}

export default {
  onEntry
}
