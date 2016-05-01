/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, message) {
  disablePatternsExcept(context, ["back", "help-exact"]);
  await enterTopic(context, "parse-haiku", null, newHaiku);
}

async function newHaiku(context, text) {
  const item = await libPoem.insert({ text, type: "haiku" });
  exitTopic(context, item);
}

export const topic = {
  onEntry
}
