/* @flow */
async function onEntry(context, message) {
  sendTextMessage(
    context,
    "You need to type a nickname and a message. For example to message basho, you'd type:" + "\r\n" +
    "message basho Wanna get some sake this weekend?"
  );
}

export const topic = {
  onEntry
}
