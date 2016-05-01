/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, id) {
  const item = await libPoem.get(id);
  sendTextMessage(context, item.text);
  exitTopic(context);
}

export default {
  onEntry
}
