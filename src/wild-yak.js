/* @flow */
import * as libSession from "./lib/session";

import type {
  InitYakOptionsType, TopicType, ParseFuncType, HandlerFuncType, IncomingStringMessageType, IncomingMessageType, OutgoingMessageType, StateType, ContextType,
  RegexParseResultType, HookType, ExternalSessionType, YakSessionType, TopicsHandler
} from "./types";


export function defTopic<TInitArgs, TContextData>(
  name: string,
  init: (args: TInitArgs, session: ExternalSessionType) => Promise<TContextData>,
  options: {
    isRoot?: boolean,
    hooks?: Array<HookType<TContextData, IncomingMessageType, Object, Object>>,
    callbacks?: Array<(state: StateType<TContextData>, params: any) => Promise>,
    afterInit?: ?(state: StateType<TContextData>, session: ExternalSessionType) => Promise
  }
) : TopicType<TInitArgs, TContextData> {
  return {
    name,
    isRoot: options.isRoot !== undefined ? options.isRoot : false,
    init,
    callbacks: options.callbacks,
    hooks: options.hooks || [],
    afterInit: options.afterInit
  };
}

export function defPattern<TInitArgs, TContextData, THandlerResult>(
  topic: TopicType<TInitArgs, TContextData>,
  name: string,
  patterns: Array<RegExp>,
  handler: HandlerFuncType<TContextData, RegexParseResultType, THandlerResult>
) : HookType<TContextData, IncomingStringMessageType, RegexParseResultType, THandlerResult> {
  return {
    name,
    parse: async (state: StateType<TContextData>, message: ?IncomingStringMessageType) : Promise<?RegexParseResultType> => {
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


export function defHook<TInitArgs, TContextData, TMessage: IncomingMessageType, TParseResult, THandlerResult>(
  topic: TopicType<TInitArgs, TContextData>,
  name: string,
  parse: ParseFuncType<TContextData, TMessage, TParseResult>,
  handler: HandlerFuncType<TContextData, TParseResult, THandlerResult>
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


export async function enterTopic<TInitArgs, TContextData, TNewInitArgs, TNewContextData, TCallbackArgs, TCallbackResult>(
  topic: TopicType<TInitArgs, TContextData>,
  state: StateType,
  newTopic: TopicType<TNewInitArgs, TNewContextData>,
  args: TNewInitArgs,
  cb?: HandlerFuncType<TContextData, TCallbackArgs, TCallbackResult>
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
    parentTopic: topic,
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


async function runHook(hook: HookType, state: StateType, message?: IncomingMessageType) : Promise<[boolean, ?Array<OutgoingMessageType>]> {
  const { context, session } = state;
  const parseResult = await hook.parse(state, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}


async function processMessage<TMessage: IncomingMessageType>(
  session: ExternalSessionType,
  message: TMessage,
  yakSession: YakSessionType,
  globalTopic,
  globalContext
) : Promise<Array<OutgoingMessageType>> {
  let handlerResult: ?Array<OutgoingMessageType>;

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
  return handlerResult ? [].concat(handlerResult) : [];
}


export function init(allTopics: Array<TopicType>, options: InitYakOptionsType) : TopicsHandler {
  const globalTopic = findTopic("global", allTopics);
  const topics = allTopics.filter(t => t.name !== "global");

  const getSessionId = options.getSessionId || (session => session.id);
  const getSessionType = options.getSessionType || (session => session.type);

  return async function(
    session: ExternalSessionType,
    message: IncomingMessageType
  ) : Promise<Array<OutgoingMessageType>> {
    const savedSession = await libSession.get(getSessionId(session), topics);
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

    const results: Array<OutgoingMessageType> = await processMessage(session, message, yakSession, globalTopic, globalContext);
    await libSession.save(yakSession);

    return results.map(r => typeof r === "string" ? { type: "string", text: r } : r);
  }
}
