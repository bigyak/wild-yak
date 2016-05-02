/* @flow */
import libAccount from "../domain/account";
import libUser from "../domain/user";
import libPoem from "../domain/poem";

async function onEntry(context, username) {
  sendMessage(context, {
    type: 'option',
    text: `Everything by ${username} will be deleted. You sure?`,
    items: [
      "Yes",
      "No"
    ]
  });
  context.current.username = username;
}

async function deleteUser(context) {
  const username = context.current.username;
  const account = await libAccount.get(context.account);
  account.usernames = account.usernames.filter(n => n !== username = username);
  await libAccount.save(account);
  await libUser.removeByUsername(username);
  await libPoem.removeAllByUsername(username);
  exitTopic(context);
}

export const topic = {
  onEntry,
  parsers: [
    defPattern("yes", ["^yes$", "^ok$", "^yup$", "^y$"], deleteUser),
    defPattern("no", ["^no$", "^cancel$", "^nope$", "^n$"], (context) => await exitTopic(context))
  ]
}
