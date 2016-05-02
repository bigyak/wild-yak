/* @flow */
import libAccount from "../domain/account";

async function onEntry(context) {
  const account = await libAccount.get(context.account);

  const message1 = `Your nicknames are:\r\n` +
    `${account.nicknames.join(", ")}.`;
  const message2 = `Switching your nick is easy, just say:\r\n` +
    `nick ${account.nicknames}`;

  sendTextMessage(context, message1 + message2);
  exitTopic(context);
}

export const topic = {
  onEntry
}
