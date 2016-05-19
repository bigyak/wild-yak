/* @flow */
import type { MessageType } from "../wild-yak";

export function mergeIncomingMessages<TMessage : MessageType>(messages: Array<Object>) : TMessage {
  throw new Error("Not implemented");
}

export function parseIncomingMessage<TMessage : MessageType>(message: any) : TMessage {
  const _message: TMessage = message;
  return _message;
}

export function formatOutgoingMessage<TMessage : MessageType>(message: any) : TMessage {
  const _message: TMessage = message;
  return _message;
}
