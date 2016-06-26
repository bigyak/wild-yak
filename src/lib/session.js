/* @flow */

//FIXME: This is completely broken!
import type { TopicType, YakSessionType } from "../types";

const yakSessions: { [key: string]: string } = {};

export async function clear(id: string) {
  delete yakSessions[id];
}

export async function get(id: string, topics: Array<TopicType<any, any>>) : Promise<?YakSessionType> {
  if (yakSessions[id]) {
    const yakSession: YakSessionType = JSON.parse(yakSessions[id]);
    yakSession.id = id;
    yakSession.conversations = yakSession.conversations.map(conversation => {
      const contexts = conversation.contexts.map(c => {
        const topic = topics.find(t => t.name === c.topic);
        const parentTopic = topics.find(t => t.name === c.parentTopic);
        const callbackName: string = (c.cb: any); //When we rehydrate, we get a string not an Fn.
        const ctxParams = {
          topic,
          parentTopic,
          cb: callbackName && parentTopic.callbacks ? parentTopic.callbacks[callbackName] : undefined
        };
        return Object.assign({}, c, ctxParams);
      });
      return {
        id: conversation.id,
        contexts,
        virgin: false
      }
    });
    return yakSession;
  }
}

export async function save(yakSession: YakSessionType) : Promise<void> {
  const conversations = yakSession.conversations.map(conversation => {
    const contexts = conversation.contexts.map(c => {
      const ctxParams = {
        topic: c.topic.name,
        parentTopic: c.parentTopic ? c.parentTopic.name : undefined,
        cb: c.cb ? c.cb.name : undefined
      };
      return Object.assign({}, c, ctxParams);
    });
    return {
      id: conversation.id,
      contexts,
      virgin: false
    };
  });
  const _yakSession = Object.assign({}, yakSession, { conversations });
  yakSessions[_yakSession.id] = JSON.stringify(_yakSession);
}
