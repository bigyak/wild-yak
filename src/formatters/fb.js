/* @flow */
import type { IncomingMessageType, OutgoingMessageType } from "../types";

export function mergeIncomingMessages<TMessage : IncomingMessageType>(messages: Array<any>) : TMessage {
  throw new Error("Not implemented");
}

export function parseIncomingMessage<TMessage : IncomingMessageType>(message: any) : TMessage {
  const _message: TMessage = message;
  if (message.postback) {
    _message.isPostback = true;
    _message.text = message.postback.payload;
  } else {
    _message.isPostback = false;
  }
  return _message;
}

export function formatOutgoingMessage<TMessage : OutgoingMessageType>(message: any) : TMessage {
  throw new Error("Not implemented");
}
