/* @flow */
import haiku from "../domain/haiku";

async function onEntry(context, args) {
  await switchToTopic(context, "parse-haiku");
}

export default async function() {
  return { onEntry };
}
