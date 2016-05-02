import libUser from "../../domain/user";

async function onEntry(context, args) {
  const user = await libUser.get(context.username);
  const tipIndex = user.tipIndex + 1;
  sendTextMessage(context, tipjar[tipIndex]);
  user.tipIndex = tipIndex;
  const newUser = await libUser.save(user);
  exitTopic(context);
}

export const topic = {
  onEntry
}
