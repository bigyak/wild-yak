/* @flow */
import libUser from "../domain/user";

async function follow(context, args) {
  const item = await libPoem.insert({ text: args.text, type: haiku });
  exitTopic(context);
}

export default async function() {
  return {
    onEntry: async (context, message) => await enterTopic(context, "parse-haiku", newHaiku)
  };
}
