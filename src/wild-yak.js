/* @flow */
export type Topic = {
  patterns: Array<string>,
  parsers: Array<Function>,
  virgin: bool,
  fn: () => void
}

export type Topics = {
  [key: string]: Topic
}

export type Context = {
  name: string,
  [key: string]: object
}

export type Handler = (session: Context, dict: Object) => void

export type PatternOptions = {}

export type ParserOptions = {}


export function defPatterns(name, pattern, handle, options) {
  const regex = new Regex(pattern);
  return {
    name,
    parse: async (context, message) => {
      const text = message.text;
      const matches = regex.exec(text);
      return matches !== null ? matches : false;
    },
    handle,
    options
  };
}

export function defParser(name, parse, handler, options) {
  return {
    name,
    parse,
    handle,
    options
  };
}

export function activeContext(session) {
  return session.contexts.slice(-1)[0];
}

export async function enterTopic(session, topic, args, cb) {
  const context = {
    topic,
    activeParsers: [],
    disabledParsers: [],
    cb: cb ? cb.name : undefined
  };
  return session.contexts.push(context);
}

export async function exitTopic(session, args) {
  const lastContext = session.contexts.pop();
  const lastTopic = session.topics.definition[lastContext.topic];
  if (lastContext.cb) {
    await lastTopic[lastContext.cb](session, args)
  }
  return lastTopic;
}

export async function exitAllTopics(session) {
  session.contexts = [];
}

export async function disableParsersExcept(session, list) {
  const context = activeContext(session);
  context.activeParsers = list;
}

export async function disableParsers(session, list) {
  const context = activeContext(session);
  context.disabledParsers = list;
}

async function parse(parser, session, message) {
  const parseResult = await parser.parse(session, message);
  if (parseResult !== false || parseResult !== undefined) {
    await parser.handle(session, parseResult);
    return true;
  } else {
    return false;
  }
}

export async function init(topics: Topics) {
  return async function(message, session) {
    const context = activeContext(session);

    const globalTopic = topics.definition.global;
    const currentTopic = topics.definition[context.topic];

    session.topics = topics;

    /*
      Check the parsers in the local topic first.
    */
    const handled = false;
    for (let parser in currentTopic.definition.parsers) {
      handled = await parse(parser, session, message);
      if (handled) {
        break;
      }
    }

    /*
      If not found, try global definitions.
      While checking global definitions,
        if activeParsers array is defined, the parser must be in it.
        if activeParsers is not defined, the parser must not be in disabledParsers
    */
    if (!handled) {
      for (let parser in global.definition.parsers) {
        if (
          activeParsers.contains(parser.name) ||
          (activeParsers.length === 0 && !disabledParsers.contains(parser.name))
        ) {
          handled = await parse(parser, session, message);
          if (handled) {
            break;
          }
        }
      }
    }

    session.topics = undefined; //Do this since session is serialized for each user session. Topics is
  }
}
