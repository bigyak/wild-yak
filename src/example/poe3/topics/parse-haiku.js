/* @flow */
import haiku from "../domain/haiku";

async function onEntry(context, args) {
  sendMessage(context, "Three lines. Type away...");
}

async function isValid(context, message) {
  const validation = await poem.validateHaiku(message.text);
  return {
    isValid: validation.isValid,
    text: message.text,
    message: validation.message
  }
}

async function saveHaiku(context, args) {
  if (args.isValid) {
    await exitTopic(context, { text: args.text });
  } else {
    sendMessage(context, validation.message);
  }
}

export default async function() {
  return {
    onEntry,
    parsers: [
      defParser(isValid, saveHaiku)
    ]
  };
}
