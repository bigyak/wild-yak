/* @flow */
import type { IncomingMessageType, OutgoingMessageType } from "../types";

export function mergeIncomingMessages<TMessage : IncomingMessageType>(messages: Array<Object>) : TMessage {
  throw new Error("Not implemented");
}

export function parseIncomingMessage<TMessage : IncomingMessageType>(message: any) : TMessage {
  const _message: TMessage = message;
  return _message;
}

export function formatOutgoingMessage<TMessage : OutgoingMessageType>(message: any) : TMessage {
  const _message: TMessage = message;
  return _message;
}
