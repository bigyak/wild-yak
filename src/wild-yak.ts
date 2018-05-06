import { Context } from "vm";
import { OutboundMessage } from "http";

/* @flow */

/*
  Represents the application controlled userData state
*/
export type UserData = any;

/*
  Options passed in by the calling external program
*/
export interface InitYakOptions {}

/*
  WildYak's response after a message is processed.
  We pass back the changed session also.
  The caller should pass the same session back when calling again.
*/
export interface YakResponse {
  conversation: Conversation;
  messages: any[];
}

/*
  Inbound messages - eg: { timestamp: 39458734895, value: "Hello!" }
*/
export interface InboundMessage<TMessage> {
  timestamp?: number;
  value: TMessage;
}

/*
  Definition of a Topic.
*/
export interface Topic<TInitArgs, TContextData> {
  name: string;
  init: (args?: TInitArgs, userData?: UserData) => Promise<TContextData>;
  isRoot: boolean;
  callbacks?: { [key: string]: (state: any, params: any) => Promise<any> };
  hooks: Array<Hook<TContextData, any, any>>;
  afterInit?: (state: ApplicationState<TContextData>) => Promise<any>;
}

/*
  Context. This is where each topic stores its state.
*/
export interface ConversationContext<TContextData> {
  data?: TContextData;
  activeHooks: Array<string>;
  disabledHooks: Array<string>;
  topic: Topic<any, TContextData>;
  parentTopic?: Topic<any, any>;
  cb?: Function;
}

/*
  Conversations contain all the contexts.
*/
export interface Conversation {
  contexts: Array<ConversationContext<any>>;
  virgin: boolean;
}

/*
  Parse a message. Takes in a message and returns a ParseResult.
  The ParseResult is passed on to the Handler.
*/
export type ParseFunc<TContextData, TParseResult> = (
  state: ApplicationState<TContextData>,
  message: InboundMessage<any>
) => Promise<TParseResult>;

/*
  Recieves a ParseResult from the Parse() function. Handler can optionally return a result.
*/
export type HandlerFunc<TContextData, TParseResult, TOutboundMessage> = (
  state: ApplicationState<TContextData>,
  args: TParseResult
) => Promise<TOutboundMessage>;

/*
  The Hook. Contains a name, a parse(): ParseFunc function, a handler(): HandlerFunc
*/
export interface Hook<TContextData, TParseResult, TOutboundMessage> {
  name: string;
  parse: ParseFunc<TContextData, TParseResult>;
  handler: HandlerFunc<TContextData, TParseResult, TOutboundMessage>;
}

/*
  State that is passed into every function.
  Contains a context and an external userData.
  The external userData helps the topic work with application state.
  eg: userData.shoppingCart.items.count
*/
export interface ApplicationState<TContextData> {
  context: ConversationContext<TContextData>;
  conversation: Conversation;
  userData?: UserData;
}

/*
  The resume of a RegExp parser.
  Contains original message, index of matched pattern, and a list of matches.
*/
export interface RegexParseResult {
  message: InboundMessage<string>;
  i: number;
  matches: Array<string>;
}

/*
  Handler returned to the external app. This is the entry point into Wild Yak
*/
export type TopicsHandler = (
  message: InboundMessage<any>,
  conversation?: Conversation,
  userData?: UserData
) => Promise<YakResponse>;

export function defTopic<TInitArgs, TContextData, OutboundMessage>(
  name: string,
  init: (args?: TInitArgs, userData?: UserData) => Promise<TContextData>,
  options: {
    isRoot?: boolean;
    hooks?: Array<Hook<TContextData, any, any>>;
    callbacks?: {
      [key: string]: (
        state: ApplicationState<TContextData>,
        params: any
      ) => Promise<any>;
    };
    afterInit?: (state: ApplicationState<TContextData>) => Promise<any>;
  }
): Topic<TInitArgs, TContextData> {
  return {
    name,
    isRoot: options.isRoot !== undefined ? options.isRoot : false,
    init,
    callbacks: options.callbacks,
    hooks: options.hooks || [],
    afterInit: options.afterInit
  };
}

function incomingMessageIsString(
  msg: InboundMessage<any>
): msg is InboundMessage<string> {
  return typeof msg.value === "string";
}

export function defPattern<TContextData, TOutboundMessage>(
  name: string,
  patterns: Array<RegExp>,
  handler: HandlerFunc<
    TContextData,
    RegexParseResult | undefined,
    TOutboundMessage
  >
): Hook<TContextData, RegexParseResult | undefined, TOutboundMessage> {
  return {
    name,
    parse: async (
      state: ApplicationState<TContextData>,
      message: InboundMessage<any>
    ): Promise<RegexParseResult | undefined> => {
      if (message && incomingMessageIsString(message)) {
        const text = message.value;
        for (let i = 0; i < patterns.length; i++) {
          const matches = patterns[i].exec(text);
          if (matches) {
            return { message, i, matches };
          }
        }
      } else {
      }
    },
    handler
  };
}

export function defHook<
  TContextData,
  TInboundMessage,
  TParseResult,
  TOutboundMessage
>(
  name: string,
  parse: ParseFunc<TContextData, TParseResult>,
  handler: HandlerFunc<TContextData, TParseResult, TOutboundMessage>
): Hook<TContextData, TParseResult, TOutboundMessage> {
  return {
    name,
    parse,
    handler
  };
}

export function activeContext(
  conversation: Conversation
): ConversationContext<any> {
  return conversation.contexts.slice(-1)[0];
}

function findTopic(
  name: string,
  topics: Array<Topic<any, any>>
): Topic<any, any> {
  return topics.filter(t => t.name === name)[0];
}

export async function enterTopic<
  TParentInitArgs,
  TParentContextData,
  TNewInitArgs,
  TNewContextData,
  TCallbackArgs,
  TCallbackResult
>(
  state: ApplicationState<TParentContextData>,
  newTopic: Topic<TNewInitArgs, TNewContextData>,
  parentTopic: Topic<TParentInitArgs, TParentContextData>,
  args?: TNewInitArgs,
  cb?: HandlerFunc<TParentContextData, TCallbackArgs, TCallbackResult>
): Promise<void> {
  const { context: currentContext, conversation, userData } = state;

  const contextOnStack = activeContext(conversation);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ConversationContext<TNewContextData> = {
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
    await newTopic.afterInit({ context: newContext, conversation, userData });
  }
}

export async function exitTopic<TContextData>(
  state: ApplicationState<TContextData>,
  args?: Object
): Promise<any> {
  const { context, conversation, userData } = state;

  if (context !== activeContext(conversation)) {
    throw new Error("You can only exit from the current context.");
  }

  const lastContext = conversation.contexts.pop();

  if (lastContext && lastContext.cb) {
    const cb: any = lastContext.cb; //keep flow happy. FIXME
    const parentContext = activeContext(conversation);
    return await cb(
      { context: parentContext, conversation, userData: state.userData },
      args
    );
  }
}

export async function clearAllTopics<TContextData>(
  state: ApplicationState<TContextData>
): Promise<void> {
  const { context, conversation, userData } = state;

  if (context !== activeContext(conversation)) {
    throw new Error("You can only exit from the current context.");
  }

  conversation.contexts = [];
}

export function disableHooksExcept<TContextData>(
  state: ApplicationState<TContextData>,
  list: Array<string>
): void {
  state.context.activeHooks = list;
}

export function disableHooks<TContextData>(
  state: ApplicationState<TContextData>,
  list: Array<string>
): void {
  state.context.disabledHooks = list;
}

async function runHook<TContextData, TParseResult, TOutboundMessage>(
  hook: Hook<TContextData, Object, TOutboundMessage>,
  state: ApplicationState<TContextData>,
  message: InboundMessage<any>
): Promise<[boolean, TOutboundMessage] | [false, any]> {
  const { context, userData } = state;
  const parseResult = await hook.parse(state, message);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}

async function processMessage<TInboundMessage, TOutboundMessage>(
  message: InboundMessage<any>,
  conversation: Conversation,
  userData: UserData,
  globalContext: ConversationContext<any>,
  globalTopic: Topic<any, any>,
  topics: Array<Topic<any, any>>
): Promise<Array<any>> {
  let handlerResult: any;

  const context = activeContext(conversation);
  /*
    Check the hooks in the local topic first.
  */
  let handled = false;
  if (context) {
    const currentTopic = findTopic(context.topic.name, topics);

    if (currentTopic.hooks) {
      for (let hook of currentTopic.hooks) {
        [handled, handlerResult] = await runHook(
          hook,
          { context, conversation, userData },
          message
        );
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
        !context ||
        context.activeHooks.includes(hook.name) ||
        (context.activeHooks.length === 0 &&
          (context.disabledHooks.length === 0 ||
            !context.disabledHooks.includes(hook.name)))
      ) {
        [handled, handlerResult] = await runHook(
          hook,
          { context: context || globalContext, conversation, userData },
          message
        );
        if (handled) {
          break;
        }
      }
    }
  }
  return handlerResult
    ? Array.isArray(handlerResult)
      ? handlerResult
      : [handlerResult]
    : [];
}

export function init(
  allTopics: Array<Topic<any, any>>,
  options: InitYakOptions = {}
): TopicsHandler {
  return async function(
    rawMessage: string | InboundMessage<any>,
    conversation = { contexts: [], virgin: true },
    userData?: UserData
  ): Promise<YakResponse> {
    const message =
      typeof rawMessage === "string"
        ? { timestamp: Date.now(), value: rawMessage }
        : rawMessage;

    const globalTopic = findTopic("global", allTopics);
    const topics = allTopics.filter(t => t.name !== "global");

    const globalContext = {
      activeHooks: [],
      disabledHooks: [],
      topic: globalTopic
    };

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

    const results = await processMessage(
      message,
      conversation,
      userData,
      globalContext,
      globalTopic,
      topics
    );

    return {
      conversation,
      messages: results
    };
  };
}
