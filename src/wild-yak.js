/* @flow */
import * as fbFormatter from "./formatters/fb";
import * as webFormatter from "./formatters/web";
import * as libSession from "./lib/session";


import type {
  TopicType, TParse, THandler, StringMessageType, MessageType, StateType, ContextType,
  RegexParseResultType, HookType, ExternalSessionType, YakSessionType
} from "./types";


const formatters = {
  facebook: fbFormatter,
  web: webFormatter
}


export function defTopic<TInitArgs, TContextData>(
  name: string,
  init: (args: TInitArgs, session: ExternalSessionType) => Promise<TContextData>,
  options: {
    isRoot?: boolean,
    hooks?: Array<HookType<TContextData, MessageType, Object, Object>>,
    afterInit?: ?(state: StateType<TContextData>, session: ExternalSessionType) => void
  }
) : TopicType<TInitArgs, TContextData> {
  return {
    name,
    isRoot: options.isRoot !== undefined ? options.isRoot : false,
    init,
    hooks: options.hooks || [],
    afterInit: options.afterInit
  };
}


export function defPattern<TInitArgs, TContextData, THandlerResult>(
  topic: TopicType<TInitArgs, TContextData>,
  name: string,
  patterns: Array<RegExp>,
  handler: THandler<TContextData, RegexParseResultType, THandlerResult>
) : HookType<TContextData, StringMessageType, RegexParseResultType, THandlerResult> {
  return {
    name,
    parse: async (state: StateType<TContextData>, message: ?StringMessageType) : Promise<?RegexParseResultType> => {
      if (message) {
        const text = message.text;
        for (let i = 0; i < patterns.length; i++) {
          const matches = patterns[i].exec(text);
          if (matches) {
            return { message, i, matches };
          }
        }
      }
    },
    handler
  };
}


export function defHook<TInitArgs, TContextData, TMessage: MessageType, TParseResult, THandlerResult>(
  topic: TopicType<TInitArgs, TContextData>,
  name: string,
  parse: TParse<TContextData, TMessage, TParseResult>,
  handler: THandler<TContextData, TParseResult, THandlerResult>
) : HookType<TContextData, TMessage, TParseResult, THandlerResult> {
  return {
    name,
    parse,
    handler
  };
}


export function activeContext(yakSession: YakSessionType) : ContextType {
  return yakSession.contexts.slice(-1)[0];
}


function findTopic(name: string, topics: Array<TopicType>) : TopicType {
  return topics.filter(t => t.name === name)[0]
}


export async function enterTopic<TInitArgs, TContextData, TNewInitArgs, TNewContext: ContextType, TCallbackArgs, TCallbackResult>(
  topic: TopicType<TInitArgs, TContextData>,
  state: StateType,
  newTopic: TopicType<TNewInitArgs, TNewContext>,
  args: TNewInitArgs,
  cb?: THandler<TContextData, TCallbackArgs, TCallbackResult>
) : Promise {
  const currentContext = state.context;
  const session = state.session;
  const yakSession = currentContext.yakSession;

  const contextOnStack = activeContext(yakSession);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext = {
    data: await newTopic.init(args, session),
    topic: newTopic,
    yakSession,
    activeHooks: [],
    disabledHooks: [],
    cb
  };

  if (newTopic.isRoot) {
    yakSession.contexts = [newContext];
  } else {
    yakSession.contexts.push(newContext);
  }

  if (newTopic.afterInit) {
    await newTopic.afterInit({ context: newContext, session }, session);
  }
}


export async function exitTopic<TInitArgs, TContextData>(
  topic: TopicType<TInitArgs, TContextData>,
  state: StateType,
  args: Object
) : Promise<?Object> {
  const yakSession = state.context.yakSession;

  if (state.context !== activeContext(yakSession)) {
    throw new Error("You can only exit from the current context.");
  }

  const lastContext = yakSession.contexts.pop();

  if (lastContext.cb) {
    const cb: any = lastContext.cb; //keep flow happy. FIXME
    const parentContext = activeContext(yakSession);
    return await cb({ context: parentContext, session: state.session }, args);
  }
}


export function disableHooksExcept(state: StateType, list: Array<string>) : void {
  state.context.activeHooks = list;
}


export function disableHooks(state: StateType, list: Array<string>) : void {
  state.context.disabledHooks = list;
}


async function runHook(hook: HookType, state: StateType, message?: MessageType) {
  const { context, session } = state;
  const parseResult = await hook.parse(state, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}


async function processMessage<TMessage: MessageType, THandlerResult>(
  session: ExternalSessionType,
  message: TMessage,
  yakSession: YakSessionType,
  globalTopic,
  globalContext
) : Promise<?THandlerResult> {
  let handlerResult: ?THandlerResult;

  const context = activeContext(yakSession);
  /*
    Check the hooks in the local topic first.
  */
  let handled = false;
  if (context) {
    const currentTopic = findTopic(context.topic.name, yakSession.topics);

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
      if (
        !context || context.activeHooks.includes(hook.name) ||
        (context.activeHooks.length === 0 && (context.disabledHooks.length === 0 || !context.disabledHooks.includes(hook.name)))
      ) {
        [handled, handlerResult] = await runHook(hook, { context: (context || globalContext), session }, message);
        if (handled) {
          break;
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

export function init(allTopics: Array<TopicType>, options: InitOptionsType) : TopicsHandler {
  const globalTopic = findTopic("global", allTopics);
  const topics = allTopics.filter(t => t.name !== "global");

  const getSessionId = options.getSessionId || (session => session.id);
  const getSessionType = options.getSessionType || (session => session.type);
  const messageOptions = options.messageOptions || {
    strategy: "last"
  };

  return async function(session: ExternalSessionType, _messages: Array<MessageType> | MessageType) : Promise<Array<Object>> {
    const messages = _messages instanceof Array ? _messages : [_messages];

    const savedSession = await libSession.get(getSessionId(session));
    const yakSession = savedSession ? { ...savedSession, topics } :
      { id: getSessionId(session), type: getSessionType(session), contexts: [], virgin: true, topics };

    const globalContext = { yakSession, activeHooks:[], disabledHooks: [], topic: globalTopic };

    if (yakSession.virgin) {
      yakSession.virgin = false;
      const mainTopic = findTopic("main", yakSession.topics);
      if (mainTopic) {
        await enterTopic(
          globalTopic,
          { context: globalContext, session },
          mainTopic,
          undefined
        );
      }
    }

    const results = [];

    switch (messageOptions.strategy) {
      case "last": {
        const message = formatters[session.type].parseIncomingMessage(messages.slice(-1)[0]);
        const result = await processMessage(session, message, yakSession, globalTopic, globalContext);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "first": {
        const message = formatters[session.type].parseIncomingMessage(messages[0]);
        const result = await processMessage(session, message, yakSession, globalTopic, globalContext);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "single": {
        for (const _message of messages) {
          const message = formatters[session.type].parseIncomingMessage(_message);
          const result = await processMessage(session, message, yakSession, globalTopic, globalContext);
          if (result) {
            results.push(result);
          }
        }
        break;
      }
      case "merge": {
        const message = formatters[session.type].mergeIncomingMessages(messages);
        const result = await processMessage(session, message, yakSession, globalTopic, globalContext);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "custom": {
        const parsedMessages = messages.map(m => formatters[session.type].parseIncomingMessage(m));
        const customMessage = await messageOptions.messageParser(parsedMessages);
        const result = await processMessage(session, customMessage, yakSession, globalTopic, globalContext);
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
