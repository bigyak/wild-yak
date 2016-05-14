/* @flow */
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

export function defPattern(name: string, patterns: Array<string>, handler: Function, options: Object) {
  const regexen = patterns.map(p => typeof p === "string" ? new RegExp(p) : p);
  return {
    name,
    parse: async (context, message) => {
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


export function activeContext(session) {
  return session.contexts.slice(-1)[0];
}


export async function enterTopic(session, topic, args, cb) {
  const context = {
    topic,
    activeHooks: [],
    disabledHooks: [],
    cb: cb ? cb.name : undefined
  };
  if (session.topics.definitions[topic].onEntry) {
    await session.topics.definitions[topic].onEntry(session, args);
  }
  return session.contexts.push(context);
}


export async function exitTopic(session, args) {
  const lastContext = session.contexts.pop();
  const lastTopic = session.topics.definitions[lastContext.topic];
  if (lastContext.cb) {
    await lastTopic[lastContext.cb](session, args)
  }
  return lastTopic;
}


export async function exitAllTopics(session) {
  session.contexts = [];
}


export async function disableHooksExcept(session, list) {
  const context = activeContext(session);
  context.activeHooks = list;
}


export async function disableHooks(session, list) {
  const context = activeContext(session);
  context.disabledHooks = list;
}


async function runHook(hook, session, message) {
  const parseResult = await hook.parse(session, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(session, parseResult);
    return [true, handlerResult];
  } else {
    return [false];
  }
}


export async function init(topics: Topics) {
  return async function(session, message) {
    session.topics = topics;

    if (!session.contexts) {
      session.contexts = [];
      await enterTopic(session, "main", message);
    }
    const context = activeContext(session);

    const globalTopic = topics.definitions.global;
    const currentTopic = topics.definitions[context.topic];

    /*
      Check the hooks in the local topic first.
    */
    let handlerResult = false, handled = false;
    if (currentTopic.hooks) {
      for (let hook of currentTopic.hooks) {
        [handled, handlerResult] = await runHook(hook, session, message);
        if (handled) {
          break;
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
        if (
          context.activeHooks.includes(hook.name) ||
          (context.activeHooks.length === 0 && !context.disabledHooks.includes(hook.name))
        ) {
          [handled, handlerResult] = await runHook(hook, session, message);
          if (handled) {
            break;
          }
        }
      }
    }

    session.topics = undefined; //Do this since session is serialized for each user session. Topics is

    return handlerResult;
  }
}
