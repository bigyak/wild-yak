/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, args) {
  sendTextMessage(context, "To create a haiku, type three lines...");
}

export async function parser(context, message) {
  const validation = await libPoem.validateHaiku(message.text);
  return {
    isValid: validation.isValid,
    text: message.text,
    message: validation.message
  }
}

async function parseHaiku(context, args) {
  await exitTopic(context, args);
}

export const topic = {
  onEntry,
  parsers: [
    defParser("read-lines", parser, parseHaiku)
  ]
}
