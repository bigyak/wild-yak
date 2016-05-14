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


export async function enterTopic(context, topic, args, cb) {
  const session = context.session;
  const newContext = {
    topic,
    activeHooks: [],
    disabledHooks: [],
    cb: cb ? cb.name : undefined,
    session
  };
  session.contexts.push(newContext);
  if (session.topics.definitions[topic].onEntry) {
    await session.topics.definitions[topic].onEntry(newContext, args);
  }
  return newContext;
}


export async function exitTopic(context, args) {
  const session = context.session;
  const lastContext = session.contexts.pop();
  if (session.contexts.length > 0) {
    const parentTopic = session.topics.definitions[activeContext(session).topic];
    if (lastContext.cb) {
      await parentTopic[lastContext.cb](session, args)
    }
    return parentTopic;
  }
}


export async function exitAllTopics(context) {
  const session = context.session;
  session.contexts = [];
}


export async function disableHooksExcept(context, list) {
  context.activeHooks = list;
}


export async function disableHooks(context, list) {
  context.disabledHooks = list;
}


async function runHook(hook, context, message) {
  const parseResult = await hook.parse(context, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(context, parseResult);
    return [true, handlerResult];
  } else {
    return [false];
  }
}


export async function init(topics: Topics) {
  return async function(session, message) {
    session.topics = topics;
    const globalContext = {session, activeHooks:[], disabledHooks: []}
    if (!session.contexts) {
      session.contexts = [];
      await enterTopic(globalContext, "main", message);
    }
    const context = activeContext(session);

    const globalTopic = topics.definitions.global;
    /*
      Check the hooks in the local topic first.
    */
    let handlerResult = false, handled = false;
    if (context) {
      const currentTopic = topics.definitions[context.topic];

      if (currentTopic.hooks) {
        for (let hook of currentTopic.hooks) {
          [handled, handlerResult] = await runHook(hook, context, message);
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
          [handled, handlerResult] = await runHook(hook, context || globalContext, message);
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
