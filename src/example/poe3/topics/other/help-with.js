function commentHelp(context) {
  sendTextMessage(context, "");
}

const sections = [
  [["comment", "commenting", "comments"], commentHelp],
  [["like", "likes"], likesHelp],
  [["message", "messaging", "messages"], messagingHelp],
  [["haiku"], haikuHelp],
  [["follow", "followers"], followHelp],
  [["tag", "tags", "tagging"], taggingHelp],
  [["account"], accountHelp]
];

async function onEntry(context, item) {
  const [_, fn] = sections.find(i => i[0].contains(item));
  await fn(context);
  await exitTopic(context);
}

export const topic = {
  onEntry
}
