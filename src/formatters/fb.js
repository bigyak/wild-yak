/* @flow */
import type { IncomingMessageType, OutgoingMessageType, FbIncomingMessageType, FbOutgoingMessageType } from "../types";

export function mergeIncomingMessages(messages: Array<FbIncomingMessageType>) : IncomingMessageType {
  throw new Error("Not implemented");
}

export function parseIncomingMessage(message: FbIncomingMessageType) : IncomingMessageType {
  return {
    type: "string",
    timestamp: message.timestamp,
    text: message.message.text ? message.message.text : (message.postback ? message.postback.payload : "")
  }
}

export function formatOutgoingMessage(message: OutgoingMessageType) : FbOutgoingMessageType {
  throw new Error("Not implemented");
}
