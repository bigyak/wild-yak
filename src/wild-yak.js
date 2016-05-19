/* @flow */
import * as fbFormatter from "./formatters/fb";
import * as webFormatter from "./formatters/web";
import * as libSession from "./lib/session";

const formatters = {
  facebook: fbFormatter,
  web: webFormatter
}

export type TopicsType = {
  definitions: {
    [key: string]: TopicType
  }
}

export type TopicType = {
  hooks: Array<HookType<?Object, ?Object, Object>>
}

export type ExternalSessionType = Object;

export type StringMessageType = { type: "string", text: string };
export type OptionMessageType = { type: "option", values: Array<string> };
export type MessageType = StringMessageType | OptionMessageType;

export type ContextType = {
  topic: string,
  activeHooks: Array<string>,
  disabledHooks: Array<string>,
  cb?: ?{ topic: string, func: string },
  yakSession: YakSessionType
}

export type YakSessionType = {
  topics: TopicsType,
  contexts: Array<ContextType>,
  virgin: boolean
}

export type TParse<TParseResult, TMessage: MessageType> = (state: StateType, message: TMessage)  => Promise<?TParseResult>;
export type THandler<TParseResult, THandlerResult> = (state: StateType, args: TParseResult) => Promise<THandlerResult>;

export type HookType<TParseResult, THandlerResult, TMessage> = {
  name: string,
  parse: TParse<TParseResult, TMessage>,
  handler: THandler<TParseResult, THandlerResult>,
  options?: Object
};

export type PatternType = string | RegExp;

export type StateType = {
  context: ContextType,
  session: ExternalSessionType
}

export type TopicCallback<TArgs, TResult> = (state: StateType, result: TArgs) => TResult;

export type RegexParseResultType = {
  message: StringMessageType,
  i: number,
  matches: Array<string>
}

export function defPattern<TMessage: StringMessageType, TPattern: PatternType, THandlerResult>(
  name: string,
  _patterns: Array<TPattern>,
  handler: THandler<RegexParseResultType, THandlerResult>,
  options?: Object
) : HookType<RegexParseResultType, THandlerResult, TMessage> {
  const patterns : Array<TPattern> = _patterns instanceof Array ? _patterns : [_patterns];
  const regexen: Array<RegExp> = patterns.map(p => typeof p === "string" ? new RegExp(p) : p);
  return {
    name,
    parse: async ({context: ContextType, session: ExternalSessionType}, message: TMessage) : Promise<?RegexParseResultType> => {
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

export function defHook<TParseResult, THandlerResult, TMessage: MessageType>(
  name: string,
  parse: TParse<TParseResult, TMessage>,
  handler: THandler<TParseResult, THandlerResult>,
  options?: Object
) : HookType<TParseResult, THandlerResult, TMessage> {
  return {
    name,
    parse,
    handler,
    options
  };
}


export function activeContext(yakSession: YakSessionType) : ContextType {
  return yakSession.contexts.slice(-1)[0];
}


export async function enterTopic<TArgs, TCallbackArgs, TResult>(
  {context, session}: StateType,
  topic: string,
  args: TArgs,
  cb?: TopicCallback<TCallbackArgs, TResult>
) {
  const yakSession = context.yakSession;
  if (cb && context !== activeContext(yakSession)) {
    throw new Error("You can only add a callback from the top level topic.");
  }
  const newContext: ContextType = {
    topic,
    activeHooks: [],
    disabledHooks: [],
    cb: cb ? { topic: context.topic, func: cb.name } : undefined,
    yakSession
  };

  const newTopic: TopicType = yakSession.topics.definitions[topic];

  if (newTopic.isRoot) {
    yakSession.contexts = [newContext];
  } else {
    yakSession.contexts.push(newContext);
  }

  if (newTopic.onEntry) {
    return await newTopic.onEntry({ context: newContext, session }, args);
  }
}


export async function exitTopic<TArgs, TResult>(
  {context, session}: StateType,
  args: TArgs
) : Promise<?TResult> {
  const yakSession = context.yakSession;
  if (context !== activeContext(yakSession)) {
    throw new Error("You can only exit from the top level topic.");
  }
  const lastContext = yakSession.contexts.pop();
  if (yakSession.contexts.length > 0 && lastContext.cb && activeContext(yakSession).topic === lastContext.cb.topic) {
    const cb: { topic: string, func: string } = lastContext.cb;
    const parentContext = activeContext(yakSession);
    const parentTopic = yakSession.topics.definitions[cb.topic];
    return await parentTopic[cb.func]({context: parentContext, session}, args);
  }
}


async function exitAllTopics({context, session}: StateType) : Promise {
  const yakSession = context.yakSession;
  yakSession.contexts = [];
}


export function disableHooksExcept(context: ContextType, list: Array<string>) : void {
  context.activeHooks = list;
}


export function disableHooks(context: ContextType, list: Array<string>) : void {
  context.disabledHooks = list;
}


async function runHook(hook: HookType, {context, session}: StateType, message: MessageType) {
  const parseResult = await hook.parse({context, session}, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler({context, session}, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}

async function processMessage<THandlerResult, TMessage: MessageType>(
  session: ExternalSessionType,
  yakSession: YakSessionType,
  message: TMessage,
  topics: TopicsType
) : Promise<?THandlerResult> {
  let handlerResult: ?THandlerResult;

  const globalContext = { yakSession, activeHooks:[], disabledHooks: [], topic: "global" };

  if (yakSession.virgin) {
    yakSession.contexts = [];
    handlerResult = await enterTopic({ context: globalContext, session }, "main", message);
    yakSession.virgin = false;
  }

  if (typeof handlerResult === "undefined") {
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
  return handlerResult;
}


type InitOptionsType = {
  getSessionId: (session: ExternalSessionType) => string,
  getSessionType: (session: ExternalSessionType) => string,
  messageOptions: (
    { strategy: "custom", messageParser: (messages: Array<Object>) => MessageType } |
    { strategy: "single" } |
    { strategy: "merge" } |
    { strategy: "first" } |
    { strategy: "last" }
  )
}

type TopicsHandler = (session: ExternalSessionType, messages: Array<MessageType> | MessageType) => Object

export function init(topics: TopicsType, options: InitOptionsType) : TopicsHandler {

  const getSessionId = options.getSessionId || (session => session.id);
  const getSessionType = options.getSessionType || (session => session.type);
  const messageOptions = options.messageOptions || {
    strategy: "single"
  };

  return async function(session: ExternalSessionType, _messages: Array<MessageType> | MessageType) : Promise<Array<Object>> {
    const messages = _messages instanceof Array ? _messages : [_messages];

    const yakSession = (await libSession.get(getSessionId(session))) ||
      { id: getSessionId(session), type: getSessionType(session), contexts: [], virgin: true, topics } ;

    yakSession.topics = topics;

    const results = [];

    switch (messageOptions.strategy) {
      case "single": {
        for (const _message of messages) {
          const message = formatters[session.type].parseIncomingMessage(_message);
          const result = await processMessage(session, yakSession, message, topics);
          if (result) {
            results.push(result);
          }
        }
        break;
      }
      case "merge": {
        const message = formatters[session.type].mergeIncomingMessages(messages);
        const result = await processMessage(session, yakSession, message, topics);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "last": {
        const message = formatters[session.type].parseIncomingMessage(messages.slice(-1)[0]);
        const result = await processMessage(session, yakSession, message, topics);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "first": {
        const message = formatters[session.type].parseIncomingMessage(messages[0]);
        const result = await processMessage(session, yakSession, message, topics);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "custom": {
        const parsedMessages = messages.map(m => formatters[session.type].parseIncomingMessage(m));
        const customMessage = await messageOptions.messageParser(parsedMessages);
        const result = await processMessage(session, yakSession, customMessage, topics);
        if (result) {
          results.push(result);
        }
        break;
      }
      default:
        throw new Error("Unknown message type.")
    }

    await libSession.save(yakSession);
    return results;
  }
}
