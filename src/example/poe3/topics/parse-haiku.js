/* @flow */
import haiku from "../domain/haiku";

async function onEntry(context, args) {
  sendMessage(context, "Three lines. Type away...");
}

async function parseHaiku(context, message) {
  //Check if three lines...
  const validation = await haiku.validate(message.text);
  return {
    isValid: validation.isValid,
    text: message.text,
    message: validation.message
  }
}

async function saveHaiku(context, args) {
  if (args.isValid) {
    const record = await haiku.save(args.text, context.username);
    sendMessage(context, `Saved haiku as ${record.id}.`);
    await exitTopic(context);
  } else {
    sendMessage(context, validation.message);
  }
}

export default async function() {
  return {
    onEntry,
    parsers: [
      defParser(parseHaiku, saveHaiku)
    ]
  };
}
