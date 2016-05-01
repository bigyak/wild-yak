/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, username) {
  const items = await libPoem.getPoemsByUser(username);
  sendTextMessage(context, items.map(i => i.text).join("\n\n");
  exitTopic(context);
}

export default {
  onEntry
}
