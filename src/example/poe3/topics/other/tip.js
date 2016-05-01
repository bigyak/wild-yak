import libUser from "../../domain/user";

const tipjar = [
  `message basho Hello` + `\r\n` + `Sends "Hello" to the user basho`,
  `..` + `\r\n` + `(two dots) can be used to go back or cancel current action`,
  `show basho` + `\r\n` + `Shows all haikus written by basho`
]

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
