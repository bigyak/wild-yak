/* @flow */
import * as fbFormatter from "./formatters/fb";
import * as webFormatter from "./formatters/web";
import * as libSession from "./lib/session";

export type Topic = {
  patterns: Array<string>,
  hooks: Array<Function>,
  virgin: bool,
  fn: () => void
}

export type Topics = {
  [key: string]: Topic
}

export type Context = {
  name: string,
  [key: string]: Object
}

export type Handler = (session: Context, dict: Object) => void

export type PatternOptions = {}

export type HookOptions = {}

export type RegexHandler = (context: Context, matches: Array) => void

const formatters = {
  facebook: fbFormatter,
  web: webFormatter
}

export function defPattern(name: string, patterns: Array<string>, handler: Function, options: Object) {
  patterns = (patterns instanceof Array) ? patterns : [patterns];
  const regexen = patterns.map(p => typeof p === "string" ? new RegExp(p) : p);
  return {
    name,
    parse: async ({context, session}, message) => {
      const text = message.text;
      for (let i = 0; i < regexen.length; i++) {
        const matches = regexen[i].exec(text);
        if (matches !== null) {
          return {message, i, matches};
        }
      }
    },
    handler,
    options
  };
}

export function defHook(name, parse, handler, options) {
  return {
    name,
    parse,
    handler,
    options
  };
}


export function activeContext(yakSession) {
  return yakSession.contexts.slice(-1)[0];
}


export async function enterTopic({context, session}, topic, args, cb) {
  const yakSession = context.yakSession;
  const newContext = {
    topic,
    activeHooks: [],
    disabledHooks: [],
    cb: cb ? cb.name : undefined,
    yakSession
  };
  yakSession.contexts.push(newContext);
  if (yakSession.topics.definitions[topic].onEntry) {
    return await yakSession.topics.definitions[topic].onEntry({ context: newContext, session }, args);
  }
}


export async function exitTopic({context, session}, args) {
  const yakSession = context.yakSession;
  const lastContext = yakSession.contexts.pop();
  if (yakSession.contexts.length > 0) {
    const parentContext = activeContext(yakSession);
    const parentTopic = yakSession.topics.definitions[parentContext.topic];
    if (lastContext.cb) {
      return await parentTopic[lastContext.cb]({context: parentContext, session}, args);
    }
  }
}


export async function exitAllTopics({context, session}) {
  const yakSession = context.yakSession;
  yakSession.contexts = [];
}


export async function disableHooksExcept(context, list) {
  context.activeHooks = list;
}


export async function disableHooks(context, list) {
  context.disabledHooks = list;
}


async function runHook(hook, {context, session}, message) {
  const parseResult = await hook.parse({context, session}, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler({context, session}, parseResult);
    return [true, handlerResult];
  } else {
    return [false];
  }
}


export function init(topics: Topics, { getSessionId, getSessionType }) {

  return async function(session, _message) {
    const yakSession = (await libSession.get(getSessionId(session))) || { id: getSessionId(session), type: getSessionType(session) } ;

    const message = await formatters[session.type].parseIncomingMessage(_message);

    yakSession.topics = topics;

    let handlerResult;
    const globalContext = {yakSession, activeHooks:[], disabledHooks: []}
    if (!yakSession.contexts) {
      yakSession.contexts = [];
      handlerResult = await enterTopic({ context: globalContext, session }, "main", message);
    }
    if (!handlerResult) {
      const context = activeContext(yakSession);

      const globalTopic = topics.definitions.global;
      /*
        Check the hooks in the local topic first.
      */
      let handled = false;
      if (context) {
        const currentTopic = topics.definitions[context.topic];

        if (currentTopic.hooks) {
          for (let hook of currentTopic.hooks) {
            [handled, handlerResult] = await runHook(hook, { context, session }, message);
            if (handled) {
              break;
            }
          }
        }
      }

      /*
        If not found, try global topic.
        While checking global topic,
          if activeHooks array is defined, the hook must be in it.
          if activeHooks is not defined, the hook must not be in disabledHooks
      */
      if (!handled && globalTopic.hooks) {
        for (let hook of globalTopic.hooks) {
          if (!context ||
            (context.activeHooks.includes(hook.name) ||
            (context.activeHooks.length === 0 && !context.disabledHooks.includes(hook.name)))
          ) {
            [handled, handlerResult] = await runHook(hook, { context: (context || globalContext), session }, message);
            if (handled) {
              break;
            }
          }
        }
      }
    }

    yakSession.topics = undefined; //Do this since yakSession is serialized for each user yakSession.
    await libSession.save(yakSession);
    return handlerResult;
  }
}
