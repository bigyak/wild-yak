/* @flow */
import type { IncomingMessageType, OutgoingMessageType, WebIncomingMessageType, WebOutgoingMessageType } from "../types";

export function mergeIncomingMessages(messages: Array<WebIncomingMessageType>) : IncomingMessageType {
  throw new Error("Not implemented");
}

export function parseIncomingMessage(message: WebIncomingMessageType) : IncomingMessageType {
  return {
    type: "string",
    timestamp: message.timestamp,
    text: typeof message.text !== "undefined" ? message.text : ""
  }
}

export function formatOutgoingMessage(message: OutgoingMessageType) : WebOutgoingMessageType {
  const _message: WebOutgoingMessageType = message;
  return _message;
}
