/* @flow */
import type { YakSessionType } from "../wild-yak";

const yakSessions = {};

export async function get(id: string) : Promise<?YakSessionType> {
  if (yakSessions[id]) {
    const yakSession = JSON.parse(yakSessions[id]);
    if (yakSession.contexts) {
      yakSession.contexts.forEach(c => c.yakSession = yakSession);
    }
    return yakSession;
  }
}

export async function save(yakSession: YakSessionType) : Promise {
  const _contexts = yakSession.contexts.map(c => Object.assign({}, c, { yakSession: "" }));
  const _yakSession = Object.assign({}, yakSession, { contexts: _contexts });
  yakSessions[_yakSession.id] = JSON.stringify(_yakSession);
}
