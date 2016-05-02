/* @flow */
import libUser from "../domain/user";

async function onEntry(context, name) {
  if (!(await libUser.exists(name))) {
    const user = await libUser.create(name, context.account);
    context.username = name;
    exitTopic(context, user);
  } else {
    sendTextMessage(context, `Sorry, ${name} already exists.`);
    exitTopic(context);
  }
}

export const topic = {
  onEntry
}
