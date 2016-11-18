/* @flow */

/*
  Represents the application controlled userData state
*/
export type UserDataType = Object;

/*
  Options passed in by the calling external program
*/
export type InitYakOptionsType = {}

/*
  Message types that will be passed to the Yak
*/
type IncomingMessageBaseType = {  }
export type IncomingStringMessageType = {
  timestamp: number,
  type: "string",
  text: string
}
type IncomingMediaType = { url: string }
export type IncomingMediaMessageType = {
  timestamp: number,
  type: "media",
  attachments: Array<IncomingMediaType>
}
export type IncomingMessageType = IncomingStringMessageType | IncomingMediaMessageType;

/*
  Messages that the yak will receive from the handlers.
*/
export type OutgoingStringMessageType = { type: "string", text: string };
export type OptionMessageType = { type: "option", values: Array<string> };
export type OutgoingMessageType = string | OutgoingStringMessageType | OptionMessageType;

/*
  The replies you might get from the hook.
*/
export type HookResultType = OutgoingMessageType | Array<OutgoingMessageType>;

/*
  WildYak's response after a message is processed.
  We pass back the changed session also.
  The caller should pass the same session back when calling again.
*/
export type YakResponseType = {
  conversation: ConversationType,
  messages: HookResultType
}

/*
  Definition of a Topic.
*/
export type TopicParams<TContextData> = {
  isRoot: boolean,
  hooks: Array<HookType<TContextData, Object, Object, OutgoingMessageType>>
}

export type TopicType<TInitArgs, TContextData> = {
  name: string,
  init: (args: TInitArgs, userData?: UserDataType) => Promise<TContextData>,
  isRoot: boolean,
  callbacks?: { [key: string]: (state: any, params: any) => Promise<any> },
  hooks: Array<HookType<TContextData, Object, ?Object, HookResultType>>,
  afterInit?: ?(state: StateType<TContextData>) => Promise<any>
}

/*
  Context. This is where each topic stores its state.
*/
export type ContextType<TContextData> = {
  data?: TContextData,
  activeHooks: Array<string>,
  disabledHooks: Array<string>,
  topic: TopicType<any, TContextData>,
  parentTopic?: TopicType<any, any>,
  cb?: Function
}

/*
  Conversations contain all the contexts.
*/
export type ConversationType = {
  contexts: Array<ContextType<any>>,
  virgin: boolean,
}

/*
  Parse a message. Takes in a message and returns a ParseResult.
  The ParseResult is passed on to the Handler.
*/
export type ParseFuncType<TContextData, TMessage: IncomingMessageType, TParseResult> = (state: StateType<TContextData>, message?: TMessage)  => Promise<?TParseResult>;

/*
  Recieves a ParseResult from the Parse() function. Handler can optionally return a result.
*/
export type HandlerFuncType<TContextData, THandlerArgs, THandlerResult: HookResultType> =
  (state: StateType<TContextData>, args: THandlerArgs) => Promise<?THandlerResult>;

/*
  The Hook. Contains a name, a parse(): ParseFuncType function, a handler(): HandlerFuncType
*/
export type HookType<TContextData, TMessage: IncomingMessageType, TParseResult, THandlerResult: HookResultType> = {
  name: string,
  parse: ParseFuncType<TContextData, TMessage, TParseResult>,
  handler: HandlerFuncType<TContextData, TParseResult, THandlerResult>
};

/*
  State that is passed into every function.
  Contains a context and an external userData.
  The external userData helps the topic work with application state.
  eg: userData.shoppingCart.items.count
*/
export type StateType<TContextData> = {
  context: ContextType<TContextData>,
  conversation: ConversationType,
  userData?: UserDataType
}

/*
  The resume of a RegExp parser.
  Contains original message, index of matched pattern, and a list of matches.
*/
export type RegexParseResultType = {
  message: IncomingStringMessageType,
  i: number,
  matches: Array<string>
}

/*
  Handler returned to the external app. This is the entry point into Wild Yak
*/
export type TopicsHandlerType = (
  message: IncomingMessageType,
  conversation?: ConversationType,
  userData?: UserDataType,
) => Promise<YakResponseType>

export type TopicOptionsType<TContextData> = {
  isRoot?: boolean,
  hooks?: Array<HookType<TContextData, IncomingMessageType, ?Object, HookResultType>>,
  callbacks?: { [key: string]: (state: StateType<TContextData>, params: any) => Promise<any> },
  afterInit?: ?(state: StateType<TContextData>) => Promise<any>
}

export function defTopic<TInitArgs, TContextData>(
  name: string,
  init: (args: TInitArgs, userData?: UserDataType) => Promise<TContextData>,
) : (options: TopicOptionsType) => TopicType<TInitArgs, TContextData> {
  return (options) => ({
    name,
    isRoot: options.isRoot !== undefined ? options.isRoot : false,
    init,
    callbacks: options.callbacks,
    hooks: options.hooks || [],
    afterInit: options.afterInit
  });
}

export function defPattern<TContextData, THandlerResult: HookResultType>(
  name: string,
  patterns: Array<RegExp>,
  handler: HandlerFuncType<TContextData, RegexParseResultType, THandlerResult>
) : HookType<TContextData, IncomingStringMessageType, RegexParseResultType, THandlerResult> {
  return {
    name,
    parse: async (state: StateType<TContextData>, message: ?IncomingStringMessageType) : Promise<?RegexParseResultType> => {
      if (message) {
        const text: string = message.text;
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


export function defHook<TContextData, TMessage: IncomingMessageType, TParseResult, THandlerResult: HookResultType>(
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


export function activeContext(conversation: ConversationType) : ContextType<any> {
  return conversation.contexts.slice(-1)[0];
}


function findTopic(name: string, topics: Array<TopicType<any, any>>) : TopicType<any, any> {
  return topics.filter(t => t.name === name)[0]
}


export async function enterTopic<TParentInitArgs, TParentContextData, TNewInitArgs, TNewContextData, TCallbackArgs, TCallbackResult: HookResultType>(
  state: StateType<TParentContextData>,
  newTopic: TopicType<TNewInitArgs, TNewContextData>,
  parentTopic: TopicType<TParentInitArgs, TParentContextData>,
  args: TNewInitArgs,
  cb?: HandlerFuncType<TParentContextData, TCallbackArgs, TCallbackResult>
) : Promise<void> {
  const { context: currentContext, conversation, userData } = state;

  const contextOnStack = activeContext(conversation);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ContextType<TNewContextData> = {
    data: await newTopic.init(args, userData),
    topic: newTopic,
    parentTopic,
    activeHooks: [],
    disabledHooks: [],
    cb
  };

  if (newTopic.isRoot) {
    conversation.contexts = [newContext];
  } else {
    conversation.contexts.push(newContext);
  }

  if (newTopic.afterInit) {
    await newTopic.afterInit({ context: newContext, conversation, userData }, userData);
  }
}


export async function exitTopic<TContextData>(
  state: StateType<TContextData>,
  args: Object
) : Promise<?Object> {
  const { context, conversation, userData } = state;

  if (context !== activeContext(conversation)) {
    throw new Error("You can only exit from the current context.");
  }

  const lastContext = conversation.contexts.pop();

  if (lastContext.cb) {
    const cb: any = lastContext.cb; //keep flow happy. FIXME
    const parentContext = activeContext(conversation);
    return await cb({ context: parentContext, conversation, userData: state.userData }, args);
  }
}


export function disableHooksExcept<TContextData>(state: StateType<TContextData>, list: Array<string>) : void {
  state.context.activeHooks = list;
}


export function disableHooks<TContextData>(state: StateType<TContextData>, list: Array<string>) : void {
  state.context.disabledHooks = list;
}


async function runHook<TContextData>(
  hook: HookType<TContextData, IncomingMessageType, ?Object, HookResultType>,
  state: StateType<TContextData>,
  message?: IncomingMessageType
) : Promise<[boolean, ?HookResultType]> {
  const { context, userData } = state;
  const parseResult = await hook.parse(state, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}


async function processMessage<TMessage: IncomingMessageType>(
  message: TMessage,
  conversation: ConversationType,
  userData?: UserDataType,
  globalContext,
  globalTopic: TopicType<any, any>,
  topics: Array<TopicType<any, any>>
) : Promise<Array<OutgoingMessageType>> {
  let handlerResult: ?HookResultType;

  const context = activeContext(conversation);
  /*
    Check the hooks in the local topic first.
  */
  let handled = false;
  if (context) {
    const currentTopic = findTopic(context.topic.name, topics);

    if (currentTopic.hooks) {
      for (let hook of currentTopic.hooks) {
        [handled, handlerResult] = await runHook(hook, { context, conversation, userData }, message);
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
        [handled, handlerResult] = await runHook(
          hook,
          { context: (context || globalContext), conversation, userData },
          message
        );
        if (handled) {
          break;
        }
      }
    }
  }
  return handlerResult ? [].concat(handlerResult) : [];
}

export function init(allTopics: Array<TopicType<any, any>>, options: InitYakOptionsType = {}) : TopicsHandlerType {
  return async function(
    message: IncomingMessageType,
    conversation = { contexts: [], virgin: true },
    userData?: UserDataType,
  ) : Promise<YakResponseType> {

    const globalTopic = findTopic("global", allTopics);
    const topics = allTopics.filter(t => t.name !== "global");

    const globalContext = { activeHooks:[], disabledHooks: [], topic: globalTopic };

    if (conversation.virgin) {
      conversation.virgin = false;
      const mainTopic = findTopic("main", topics);
      if (mainTopic) {
        await enterTopic(
          { context: globalContext, conversation, userData },
          mainTopic,
          globalTopic,
          undefined
        );
      }
    }

    const results = await processMessage(message, conversation, userData, globalContext, globalTopic, topics);

    return {
      conversation,
      messages: results.map(r => typeof r === "string" ? { type: "string", text: r } : r)
    };
  }
}
