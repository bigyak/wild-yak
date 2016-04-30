/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, args) {
  if (args.id) {
    const item = await libPoem.get(args.id);
    sendMessage(context, item.text);
    exitTopic(context);
  } else if (args.username) {
    const items = await libPoem.getPoemsByUser(args.username);
    sendMessage(context, items.map(i => i.text).join("\n\n");
    exitTopic(context);
  } else if (args.action === "newest"){

  } else if (args.action === "random") {

  } else {
    
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
