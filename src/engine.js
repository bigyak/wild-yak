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

export type Handler = (context: Context, dict: Object) => void

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


export async function switchToTopic(name) {
  const topic = topics[name];

  if (context.current !== name) {
    const lastTopic = topics[context.current];
    if (lastTopic.onExit) {
      await lastTopic.onExit(context);
    }
    if (topic.onEntry) {
      await topic.onEntry(context);
    }
  }
}


export async function handle(message) {
  const topic = topics[context.current];

  switch (message.type) {
    case "text":
      await checkPatterns(topic);
      await runParsers(topic);
      break;
  }
}


export async function init(topics: Topics) {
  return {

  }
}


export async function exitNesting() {

}

async function checkPatterns() {

}

async function runParsers() {

}
