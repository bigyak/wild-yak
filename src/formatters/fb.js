/* @flow */
import type { MessageType } from "../wild-yak";

export function mergeIncomingMessages<TMessage : MessageType>(messages: Array<Object>) : TMessage {
  throw new Error("Not implemented");
}

export function parseIncomingMessage<TMessage : MessageType>(message: Object) : TMessage {
  throw new Error("Not implemented");
}

export function formatOutgoingMessage<TMessage : MessageType>(message: Object) : TMessage {
  throw new Error("Not implemented");
}
