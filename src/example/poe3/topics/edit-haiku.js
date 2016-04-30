/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, args) {
  if (args.matches.length > 1 && !isNaN(args.matches[1])) {
    const id = parseInt(args.matches[1]);
    await _editImpl(context, id);
  } else {
    const items = await libPoem.getPoemsByUser(context.username, type: "haiku");
    sendMessage(context, {
      type: "option",
      text: `You have ${items.length} haikus. Which one do you want to edit?`
      options: items.map(i => `${i.id} ${libPoem.getFirstLine(i, 32)}...`)
    });
  }
}

async function editHaiku(context, args) {
  const id = context.current.state.id;
  const item = await libPoem.update({ id, text: args.text });
  exitTopic(context);
}

async function editHaikuById(context, args) {
  const id = parseInt(args.matches[1]);
  await _editImpl(context, id);
}

async function _editImpl(context, id) {
  const item = await libPoem.get(id, context.username);
  sendMessage(context, {
    type: "option",
    text: item.text
    options: [
      "Edit this haiku",
      "Delete?",
      "Cancel"
    ]
  });
  context.current.state.id = id;
}

export default async function() {
  return {
    onEntry,
    patterns: [
      defPattern("edit this haiku", async (context) => await enterTopic("parse-haiku", editHaiku)),
      defPattern("^\([0-9]+)\s+.*", async (context, message, args) => await editHaikuById(context, { matches }))
    ]
  };
}
