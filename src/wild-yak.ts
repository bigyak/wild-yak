/* @flow */

/*
  Represents the application controlled userData state
*/
export type UserData = any;

/*
  Options passed in by the calling external program
*/
export interface IInitYakOptions {}

/*
  WildYak's response after an input is processed.
  We pass back the changed session also. 
  The caller should pass the same session back when calling again.
*/
export interface IResponse {
  contexts: IContexts;
  output: any[];
}

/*
  Definition of a Topic.
*/
export interface ITopic<TInitArgs, TContextData> {
  name: string;
  init: (args?: TInitArgs, userData?: UserData) => Promise<TContextData | void>;
  isRoot: boolean;
  callbacks?: { [key: string]: (state: any, params: any) => Promise<any> };
  hooks: Array<IHook<TContextData, any, any>>;
  afterInit?: (state: IApplicationState<TContextData>) => Promise<any | void>;
}

/*
  Context. This is where each topic stores its state.
*/
export interface ITopicContext<TContextData> {
  data?: TContextData | void;
  activeHooks: Array<string>;
  disabledHooks: Array<string>;
  topic: ITopic<any, TContextData>;
  parentTopic?: ITopic<any, any>;
  cb?: Function;
}

/*
  Contexts contain all the contexts.
*/
export interface IContexts {
  items: Array<ITopicContext<any>>;
  virgin: boolean;
}

/*
  Hooks have parser functions, which take an input and decide whether anything needs to be done with it.
  If the parser returns a value, it is passed on to the handler. If the result is undefined, skip this hook.
*/
export type ParseFunc<TContextData, TParseResult> = (
  state: IApplicationState<TContextData>,
  input: any
) => Promise<TParseResult | void>;

/*
  Recieves a ParseResult from the parse() function. 
  Handler can optionally return a result.
*/
export type HandlerFunc<TContextData, TParseResult, TOutboundMessage> = (
  state: IApplicationState<TContextData>,
  args: TParseResult
) => Promise<TOutboundMessage>;

/*
  The Hook. Contains a name, a parser and a handler.
*/
export interface IHook<TContextData, TParseResult, TOutboundMessage> {
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
export interface IApplicationState<TContextData> {
  context: ITopicContext<TContextData>;
  contexts: IContexts;
  userData?: UserData;
}

/*
  Contains original input, index of matched pattern, and a list of matches.
*/
export interface IRegexParseResult {
  input: string;
  i: number;
  matches: Array<string>;
}

/*
  Handler returned to the external app. This is the entry point into Wild Yak
*/
export type TopicsHandler = (
  input: any,
  contexts?: IContexts,
  userData?: UserData
) => Promise<IResponse>;

export function defTopic<TInitArgs, TContextData>(
  name: string,
  topicInit: (
    args?: TInitArgs,
    userData?: UserData
  ) => Promise<TContextData | void>,
  options: {
    isRoot?: boolean;
    hooks?: Array<IHook<TContextData, any, any>>;
    callbacks?: {
      [key: string]: (
        state: IApplicationState<TContextData>,
        params: any
      ) => Promise<any | void>;
    };
    afterInit?: (state: IApplicationState<TContextData>) => Promise<any | void>;
  }
): ITopic<TInitArgs, TContextData> {
  return {
    afterInit: options.afterInit,
    callbacks: options.callbacks,
    hooks: options.hooks || [],
    init: topicInit,
    isRoot: options.isRoot !== undefined ? options.isRoot : false,
    name
  };
}

export function defPattern<TContextData, TOutboundMessage>(
  name: string,
  patterns: Array<RegExp>,
  handler: HandlerFunc<TContextData, IRegexParseResult, TOutboundMessage>,
  parseMessage?: (input: any) => string
): IHook<TContextData, IRegexParseResult, TOutboundMessage> {
  return {
    handler,
    name,
    parse: async (
      state: IApplicationState<TContextData>,
      input: any
    ): Promise<IRegexParseResult | void> => {
      const text: string = parseMessage ? parseMessage(input) : input;
      for (let i = 0; i < patterns.length; i++) {
        const matches = patterns[i].exec(text);
        if (matches) {
          return { input, i, matches };
        }
      }
    }
  };
}

export function defHook<TContextData, TParseResult, TOutboundMessage>(
  name: string,
  parse: ParseFunc<TContextData, TParseResult>,
  handler: HandlerFunc<TContextData, TParseResult, TOutboundMessage>
): IHook<TContextData, TParseResult, TOutboundMessage> {
  return {
    handler,
    name,
    parse
  };
}

export function activeContext(contexts: IContexts): ITopicContext<any> {
  return contexts.items.slice(-1)[0];
}

function findTopic(
  name: string,
  topics: Array<ITopic<any, any>>
): ITopic<any, any> {
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
  state: IApplicationState<TParentContextData>,
  newTopic: ITopic<TNewInitArgs, TNewContextData>,
  parentTopic: ITopic<TParentInitArgs, TParentContextData>,
  args?: TNewInitArgs,
  cb?: HandlerFunc<TParentContextData, TCallbackArgs, TCallbackResult>
): Promise<void> {
  const { context: currentContext, contexts, userData } = state;

  const contextOnStack = activeContext(contexts);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ITopicContext<TNewContextData> = {
    activeHooks: [],
    cb,
    data: await newTopic.init(args, userData),
    disabledHooks: [],
    parentTopic,
    topic: newTopic
  };

  if (newTopic.isRoot) {
    contexts.items = [newContext];
  } else {
    contexts.items.push(newContext);
  }

  if (newTopic.afterInit) {
    await newTopic.afterInit({ context: newContext, contexts, userData });
  }
}

export async function exitTopic<TContextData>(
  state: IApplicationState<TContextData>,
  args?: any
): Promise<any> {
  const { context, contexts, userData } = state;

  if (context !== activeContext(contexts)) {
    throw new Error("You can only exit from the current context.");
  }

  const lastContext = contexts.items.pop();

  if (lastContext && lastContext.cb) {
    const cb = lastContext.cb;
    const parentContext = activeContext(contexts);
    return await cb(
      { context: parentContext, contexts, userData: state.userData },
      args
    );
  }
}

export async function clearAllTopics<TContextData>(
  state: IApplicationState<TContextData>
): Promise<void> {
  const { context, contexts, userData } = state;

  if (context !== activeContext(contexts)) {
    throw new Error("You can only exit from the current context.");
  }

  contexts.items = [];
}

export function disableHooksExcept<TContextData>(
  state: IApplicationState<TContextData>,
  list: Array<string>
): void {
  state.context.activeHooks = list;
}

export function disableHooks<TContextData>(
  state: IApplicationState<TContextData>,
  list: Array<string>
): void {
  state.context.disabledHooks = list;
}

async function runHook<TContextData, TParseResult, TOutboundMessage>(
  hook: IHook<TContextData, TParseResult, TOutboundMessage>,
  state: IApplicationState<TContextData>,
  input: any
): Promise<[boolean, TOutboundMessage] | [false, any]> {
  const { context, userData } = state;
  const parseResult = await hook.parse(state, input);
  if (parseResult !== undefined) {
    const handlerResult = await hook.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}

async function processMessage<TInboundMessage, TOutboundMessage>(
  input: any,
  contexts: IContexts,
  userData: UserData,
  globalContext: ITopicContext<any>,
  globalTopic: ITopic<any, any>,
  topics: Array<ITopic<any, any>>
): Promise<Array<any>> {
  let handlerResult: any;

  const context = activeContext(contexts);
  /*
    Check the hooks in the local topic first.
  */
  let handled = false;
  if (context) {
    const currentTopic = findTopic(context.topic.name, topics);

    if (currentTopic.hooks) {
      for (const hook of currentTopic.hooks) {
        [handled, handlerResult] = await runHook(
          hook,
          { context, contexts, userData },
          input
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
    for (const hook of globalTopic.hooks) {
      if (
        !context ||
        context.activeHooks.includes(hook.name) ||
        (context.activeHooks.length === 0 &&
          (context.disabledHooks.length === 0 ||
            !context.disabledHooks.includes(hook.name)))
      ) {
        [handled, handlerResult] = await runHook(
          hook,
          { context: context || globalContext, contexts, userData },
          input
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
  allTopics: Array<ITopic<any, any>>,
  options: IInitYakOptions = {}
): TopicsHandler {
  return async (
    input: any,
    contexts = { items: [], virgin: true },
    userData?: UserData
  ): Promise<IResponse> => {
    const globalTopic = findTopic("global", allTopics);
    const topics = allTopics.filter(t => t.name !== "global");

    const globalContext = {
      activeHooks: [],
      disabledHooks: [],
      topic: globalTopic
    };

    if (contexts.virgin) {
      contexts.virgin = false;
      const mainTopic = findTopic("main", topics);
      if (mainTopic) {
        await enterTopic(
          { context: globalContext, contexts, userData },
          mainTopic,
          globalTopic,
          undefined
        );
      }
    }

    const results = await processMessage(
      input,
      contexts,
      userData,
      globalContext,
      globalTopic,
      topics
    );

    return {
      contexts,
      output: results
    };
  };
}
