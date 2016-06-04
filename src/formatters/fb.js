/* @flow */
import type { MessageType } from "../types";

export function mergeIncomingMessages<TMessage : MessageType>(messages: Array<Object>) : TMessage {
  throw new Error("Not implemented");
}

export function parseIncomingMessage<TMessage : MessageType>(message: Object) : TMessage {
  const _message: TMessage = message;
  if (message.postback) {
    _message.isPostback = true;
    _message.text = message.postback.payload;
  } else {
    _message.isPostback = false;
  }
  return _message;
}

export function formatOutgoingMessage<TMessage : MessageType>(message: Object) : TMessage {
  const _message: TMessage = message;
  return _message;
}
