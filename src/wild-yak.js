/* @flow */
import * as fbFormatter from "./formatters/fb";
import * as webFormatter from "./formatters/web";
import * as libSession from "./lib/session";


import type {
  TopicType, InitType, TopicExitCallback, TParse, THandler, StringMessageType, MessageType, StateType, ContextType,
  RegexParseResultType, HookType, ExternalSessionType, YakSessionType
} from "./types";


const formatters = {
  facebook: fbFormatter,
  web: webFormatter
}


export function defTopic<TInitArgs, TContext: ContextType>(
  name: string,
  isRoot: boolean,
  init: InitType<TInitArgs, TContext>,
  hooks: Array<HookType<TContext, Object, Object, MessageType>>
) : TopicType<TInitArgs, TContext> {
  return { name, isRoot, init, hooks };
}


export function defPattern<TInitArgs, TContext: ContextType, THandlerResult>(
  topic: TopicType<TInitArgs, TContext>,
  name: string,
  patterns: Array<RegExp>,
  handler: THandler<TContext, RegexParseResultType, THandlerResult>
) : HookType<TContext, StringMessageType, RegexParseResultType, THandlerResult> {
  return {
    name,
    parse: async (state: StateType<TContext>, message: ?StringMessageType) : Promise<?RegexParseResultType> => {
      if (message) {
        const text = message.text;
        for (let i = 0; i < patterns.length; i++) {
          const matches = patterns[i].exec(text);
          if (matches !== null) {
            return {message, i, matches};
          }
        }
      }
    },
    handler
  };
}


export function defHook<TInitArgs, TContext: ContextType, TMessage: MessageType, TParseResult, THandlerResult>(
  topic: TopicType<TInitArgs, TContext>,
  name: string,
  parse: TParse<TContext, TMessage, TParseResult>,
  handler: THandler<TContext, TParseResult, THandlerResult>
) : HookType<TContext, TMessage, TParseResult, THandlerResult> {
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


export async function enterTopic<TInitArgs, TContext: ContextType, TNewInitArgs, TNewContext: ContextType, TCallbackArgs, TCallbackResult>(
  topic: TopicType<TInitArgs, TContext>,
  state: StateType,
  newTopic: TopicType<TNewInitArgs, TNewContext>,
  args: TNewInitArgs,
  cb?: TopicExitCallback<TInitArgs, TContext, TCallbackArgs, TCallbackResult>
) : Promise {
  const currentContext = state.context;
  const session = state.session;
  const yakSession = currentContext.yakSession;

  let newContext = await newTopic.init(args, session);
  newContext.cb = cb;
  newContext.yakSession = yakSession;
  newContext.topic = newTopic;

  if (newTopic.isRoot) {
    yakSession.contexts = [newContext];
  } else {
    yakSession.contexts.push(newContext);
  }

  if (newTopic.onEntry) {
    return await newTopic.onEntry({ context: newContext, session: state.session });
  }
}


export async function exitTopic<TInitArgs, TContext>(
  topic: TopicType<TInitArgs, TContext>,
  state: StateType,
  args: Object
) : Promise<?Object> {
  const yakSession = state.context.yakSession;

  if (state.context !== activeContext(yakSession)) {
    throw new Error("You can only exit from the current topic.");
  }

  const lastContext = yakSession.contexts.pop();

  if (lastContext.cb) {
    const parentContext = activeContext(yakSession);
    return await lastContext.cb({ context: parentContext, session: state.session }, args);
  }
}


export function disableHooksExcept(context: ContextType, list: Array<string>) : void {
  context.activeHooks = list;
}


export function disableHooks(context: ContextType, list: Array<string>) : void {
  context.disabledHooks = list;
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
  yakSession: YakSessionType
) : Promise<?THandlerResult> {
  let handlerResult: ?THandlerResult;

  const globalTopic = findTopic("global", yakSession.topics);
  const globalContext = { yakSession, activeHooks:[], disabledHooks: [], topic: globalTopic };

  if (yakSession.virgin) {
    yakSession.virgin = false;
    const mainTopic = findTopic("main", yakSession.topics);
    await enterTopic(
      globalTopic,
      { context: globalContext, session },
      mainTopic,
      message
    );
  }

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

export function init(topics: Array<TopicType>, options: InitOptionsType) : TopicsHandler {
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
          const result = await processMessage(session, message, yakSession);
          if (result) {
            results.push(result);
          }
        }
        break;
      }
      case "merge": {
        const message = formatters[session.type].mergeIncomingMessages(messages);
        const result = await processMessage(session, message, yakSession);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "last": {
        const message = formatters[session.type].parseIncomingMessage(messages.slice(-1)[0]);
        const result = await processMessage(session, message, yakSession);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "first": {
        const message = formatters[session.type].parseIncomingMessage(messages[0]);
        const result = await processMessage(session, message, yakSession);
        if (result) {
          results.push(result);
        }
        break;
      }
      case "custom": {
        const parsedMessages = messages.map(m => formatters[session.type].parseIncomingMessage(m));
        const customMessage = await messageOptions.messageParser(parsedMessages);
        const result = await processMessage(session, customMessage, yakSession);
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
