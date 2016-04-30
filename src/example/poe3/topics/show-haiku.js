/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, args) {
  if (args.id) {
    const item = await libPoem.get(args.id);
    sendMessage(context, item.text);
    exitTopic(context);
  } else if (args.username) {
    const items = await libPoem.getPoemsByUser(args.username);
    sendMessage(context, item.text);
    exitTopic(context);
  } else {
    const items = await libPoem.getPoemsByUser(context.username);
    sendMessage(context, {
      type: "option",
      text: `You have ${items.length} haikus. Select the one you wish to edit.`
      options: items.map(i => `${i.id} ${haiku.getFirstLine(i, 32)}...`)
    });
  }
}

export default async function() {
  return {
    onEntry,
    patterns: [
      defPattern("show [0-9+]", "")
    ]
  };
}
