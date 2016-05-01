/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, id) {
  const id = parseInt(id);
  const item = await libPoem.get(id, context.username);
  sendTextMessage(context, {
    type: "option",
    text: item.text
    options: [
      "Edit",
      "Delete",
      "Cancel"
    ]
  });
  context.current.state.id = id;
}

async function editHaiku(context, text) {
  const id = context.current.state.id;
  const _item = await libPoem.get(id, context.username);
  const item = Object.assign(item, { text });
  const saved = await libPoem.update(item);
  exitTopic(context, saved);
}

async function deleteHaiku(context) {
  const id = context.current.state.id;
  const item = await libPoem.remove({ id });
  exitTopic(context);
}

export const topic = {
  onEntry,
  parsers: [
    defPattern("edit", async (context) => await enterTopic("parse-haiku", editHaiku)),
    defPattern("delete", deleteHaiku),
  ]
}