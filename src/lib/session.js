/* @flow */

//FIXME: This is completely broken!
import type { TopicType, YakSessionType } from "../types";

const yakSessions = {};

export async function get(id: string, topics: Array<TopicType>) : Promise<?YakSessionType> {
  if (yakSessions[id]) {
    const yakSession = JSON.parse(yakSessions[id]);
    yakSession.contexts = yakSession.contexts.map(c => {
      const topic = topics.find(t => t.name === c.topic);
      const parentTopic = topics.find(t => t.name === c.parentTopic);
      const ctxParams = {
        yakSession,
        topic,
        parentTopic,
        cb: c.cb && parentTopic.callbacks ? parentTopic.callbacks[c.cb] : undefined
      };
      return Object.assign({}, c, ctxParams);
    });
    yakSession.topics = topics;
    return yakSession;
  }
}

export async function save(yakSession: YakSessionType) : Promise {
  const _contexts = yakSession.contexts.map(
    c => {
      const ctxParams = {
        yakSession: undefined,
        topic: c.topic.name,
        parentTopic: c.parentTopic ? c.parentTopic.name : undefined,
        cb: c.cb ? c.cb.name : undefined
      };
      return Object.assign({}, c, ctxParams);
    }
  );
  const _yakSession = Object.assign({}, yakSession, { contexts: _contexts, topics: undefined });
  yakSessions[_yakSession.id] = JSON.stringify(_yakSession);
}
