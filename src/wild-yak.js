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

export function createContext() {
  return {};
}

export function createTopics() {
  return {};
}

export function defTopic(topics: Topics, name: string, fn: Function) {
  const topic = {
    patterns: [],
    parsers: [],
    virgin: true,
    fn: fn
  };
  topics[name] = topic;
  return topic;
}


export function defPattern(topic: Topic, pattern: string, handler: Handler, options: PatternOptions) {
  return defPatterns(topic, [pattern], handler, options)
}

export function defPatterns(topic: Topic, patterns: Array<string>, handler: Handler, options = PatternOptions) {
  topic.patterns.push({
    patterns,
    handler
  });
}

export function defParser(topic: Topic, parser: Parser, handler: Handler, options = ParserOptions) {
  topic.parsers.push({
    parser,
    handler
  });
}

export function activeContext(session) {
  return session.contexts.slice(-1)[0];
}

export async function enterTopic(session, topic, args, cb) {
  const context = { topic, cb: cb ? cb.name : undefined };
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

export async function init(topics: Topics) {
  return async function(message, session) {
    const state = currentState(session);
    const currentTopic = topics.definition[state.topic];

    //We have to execute parsers in the current and global topics
    const parsers = currentTopic.definition.parsers.concat(topics.definition.global.parsers);

    session.topics = topics;
    for (let parser in parsers) {
      const parseResult = await parser.parse(session, message);
      if (parseResult !== false || parseResult !== undefined) {
        await parser.handle(session, parseResult);
        break;
      }
    }
    session.topics = undefined;
  }
}
