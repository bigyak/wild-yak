/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, args) {
  if (args.id) {
    const item = await libPoem.get(args.id, context.username);
    sendMessage(context, {
      type: "option",
      text: item.text
      options: [
        "Edit this haiku",
        "Delete?",
        "Cancel"
      ]
    });
    switchToTopic("parse-haiku");
  } else {
    const items = await libPoem.getPoemsByUser(context.username, type: "haiku");
    sendMessage(context, {
      type: "option",
      text: `You have ${items.length} haikus. Select the one you wish to edit.`
      options: items.map(i => `${i.id} ${libPoem.getFirstLine(i, 32)}...`)
    });
  }
}

export default async function() {
  return {
    onEntry,
    patterns: [
      defPattern("[0-9+]", "")
    ]
  };
}
