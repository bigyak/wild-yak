/*
  Options passed in by the calling external program
*/
export interface IInitOptions {}

/*
  WildYak's response after an input is processed.
  We pass back the changed session also. 
  The caller should pass the same session back when calling again.
*/
export interface IResponse<TMessage, TUserData> {
  contexts: IContexts<TMessage, TUserData>;
  output: any[];
}

/*
  Definition of a Topic.
*/
export interface ITopic<TInitArgs, TContextData, TMessage, TUserData>
  extends ITopicBase<TInitArgs, TContextData, TUserData> {
  isRoot: boolean;
  callbacks: { [key: string]: (state: any, params: any) => Promise<any> };
  conditions: Array<ICondition<TContextData, any, any, TMessage, TUserData>>;
  afterInit?: (
    state: IApplicationState<TContextData, TMessage, TUserData>
  ) => Promise<any | void>;
}

/*
  Context. This is where each topic stores its state.
*/
export interface ITopicContext<TContextData, TMessage, TUserData> {
  data?: TContextData | void;
  activeConditions: Array<string>;
  disabledConditions: Array<string>;
  topic: ITopic<any, TContextData, TMessage, TUserData>;
  parentTopic?: ITopic<any, any, TMessage, TUserData>;
  cb?: Function;
}

/*
  Contexts contain all the contexts.
*/
export interface IContexts<TMessage, TUserData> {
  items: Array<ITopicContext<any, TMessage, TUserData>>;
  virgin: boolean;
}

/*
  Conditions have predicates, which take an input and decide whether anything needs to be done with it.
  If the parser returns a value, it is passed on to the handler. If the result is undefined, skip this condition.
*/
export type Predicate<TContextData, TParseResult, TMessage, TUserData> = (
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
  input: TMessage
) => Promise<TParseResult | void>;

/*
  Recieves a ParseResult from the parse() function. 
  Handler can optionally return a result.
*/
export type HandlerFunc<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TUserData
> = (
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
  args: TParseResult
) => Promise<TOutboundMessage>;

/*
  The Condition. Contains a name, a predicate and a handler.
*/
export interface ICondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TUserData
> {
  name: string;
  predicate: Predicate<
    TContextData,
    TParseResult,
    TMessage,
    TUserData | undefined
  >;
  handler: HandlerFunc<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TUserData | undefined
  >;
}

/*
  State that is passed into every function.
  Contains a context and an external userData.
  The external userData helps the topic work with application state.
  eg: userData.shoppingCart.items.count
*/
export interface IApplicationState<TContextData, TMessage, TUserData> {
  context: ITopicContext<TContextData, TMessage, TUserData | undefined>;
  contexts: IContexts<TMessage, TUserData | undefined>;
  userData: TUserData | undefined;
}

/*
  Contains original input, index of matched pattern, and a list of matches.
*/
export interface IRegexParseResult<TInput> {
  input: TInput;
  i: number;
  matches: Array<string>;
}

/*
  Handler returned to the external app. This is the entry point into Wild Yak
*/
export type TopicsHandler<TMessage, TUserData> = (
  input: TMessage,
  contexts?: IContexts<TMessage, TUserData | undefined>,
  userData?: TUserData
) => Promise<IResponse<TMessage, TUserData>>;

export interface ITopicBase<TInitArgs, TContextData, TUserData> {
  name: string;
  init: (
    args?: TInitArgs,
    userData?: TUserData
  ) => Promise<TContextData | void>;
}

export function createTopic<TMessage, TUserData>() {
  return <TInitArgs, TContextData>(
    name: string,
    topicInit: (
      args?: TInitArgs,
      userData?: TUserData
    ) => Promise<TContextData | void>
  ) => {
    const topic = {
      init: topicInit,
      name
    };

    return completeTopic<TInitArgs, TContextData, TMessage, TUserData>(topic);
  };
}

function completeTopic<TInitArgs, TContextData, TMessage, TUserData>(
  topic: ITopicBase<TInitArgs, TContextData, TUserData | undefined>
) {
  return (options: {
    isRoot?: boolean;
    conditions?: Array<
      ICondition<TContextData, any, any, TMessage, TUserData | undefined>
    >;
    callbacks?: {
      [key: string]: (
        state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
        params: any
      ) => Promise<any | void>;
    };
    afterInit?: (
      state: IApplicationState<TContextData, TMessage, TUserData | undefined>
    ) => Promise<any | void>;
  }): ITopic<TInitArgs, TContextData, TMessage, TUserData | undefined> => {
    return {
      afterInit: options.afterInit,
      callbacks: options.callbacks || {},
      conditions: options.conditions || [],
      isRoot: typeof options.isRoot !== "undefined" ? options.isRoot : false,
      ...topic
    };
  };
}

export function regexParse<TContextData, TMessage, TUserData>(
  patterns: Array<RegExp>,
  inputToString: (input: TMessage) => string
) {
  return async (
    state: IApplicationState<TContextData, TMessage, TUserData>,
    input: TMessage
  ): Promise<IRegexParseResult<TMessage> | void> => {
    const text = inputToString(input);
    for (let i = 0; i < patterns.length; i++) {
      const matches = patterns[i].exec(text);
      if (matches) {
        return { input, i, matches };
      }
    }
  };
}

export function createCondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TUserData
>(
  name: string,
  predicate: Predicate<
    TContextData,
    TParseResult,
    TMessage,
    TUserData | undefined
  >,
  handler: HandlerFunc<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TUserData | undefined
  >
): ICondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TUserData | undefined
> {
  return {
    handler,
    name,
    predicate
  };
}

export function activeContext<TMessage, TUserData>(
  contexts: IContexts<TMessage, TUserData | undefined>
): ITopicContext<any, TMessage, TUserData | undefined> {
  return contexts.items.slice(-1)[0];
}

function findTopic<TMessage, TUserData>(
  name: string,
  topics: Array<ITopic<any, any, TMessage, TUserData | undefined>>
): ITopic<any, any, TMessage, TUserData | undefined> {
  return topics.filter(t => t.name === name)[0];
}

export async function enterTopic<
  TParentInitArgs,
  TParentContextData,
  TNewInitArgs,
  TNewContextData,
  TCallbackArgs,
  TCallbackResult,
  TMessage,
  TUserData
>(
  state: IApplicationState<TParentContextData, TMessage, TUserData | undefined>,
  newTopic: ITopic<
    TNewInitArgs,
    TNewContextData,
    TMessage,
    TUserData | undefined
  >,
  parentTopic: ITopic<
    TParentInitArgs,
    TParentContextData,
    TMessage,
    TUserData | undefined
  >,
  args?: TNewInitArgs,
  cb?: HandlerFunc<
    TParentContextData,
    TCallbackArgs,
    TCallbackResult,
    TMessage,
    TUserData
  >
): Promise<void> {
  const { context: currentContext, contexts, userData } = state;

  const contextOnStack = activeContext(contexts);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ITopicContext<
    TNewContextData,
    TMessage,
    TUserData | undefined
  > = {
    activeConditions: [],
    cb,
    data: await newTopic.init(args, userData),
    disabledConditions: [],
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

export async function exitTopic<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
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

export async function clearAllTopics<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>
): Promise<void> {
  const { context, contexts, userData } = state;

  if (context !== activeContext(contexts)) {
    throw new Error("You can only exit from the current context.");
  }

  contexts.items = [];
}

export function disableConditionsExcept<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
  list: Array<string>
): void {
  state.context.activeConditions = list;
}

export function disableConditions<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
  list: Array<string>
): void {
  state.context.disabledConditions = list;
}

async function runCondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TUserData
>(
  condition: ICondition<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TUserData | undefined
  >,
  state: IApplicationState<TContextData, TMessage, TUserData | undefined>,
  input: TMessage
): Promise<[boolean, TOutboundMessage] | [false, any]> {
  const { context, userData } = state;
  const parseResult = await condition.predicate(state, input);
  if (parseResult !== undefined) {
    const handlerResult = await condition.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}

async function processMessage<TOutboundMessage, TMessage, TUserData>(
  input: any,
  contexts: IContexts<TMessage, TUserData | undefined>,
  userData: TUserData | undefined,
  globalContext: ITopicContext<any, TMessage, TUserData | undefined>,
  globalTopic: ITopic<any, any, TMessage, TUserData | undefined>,
  topics: Array<ITopic<any, any, TMessage, TUserData | undefined>>
): Promise<Array<any>> {
  let handlerResult: any;

  const context = activeContext(contexts);
  /*
    Check the conditions in the local topic first.
  */
  let handled = false;
  if (context) {
    const currentTopic = findTopic(context.topic.name, topics);

    if (currentTopic.conditions) {
      for (const condition of currentTopic.conditions) {
        [handled, handlerResult] = await runCondition(
          condition,
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
      if activeConditions array is defined, the condition must be in it.
      if activeConditions is not defined, the condition must not be in disabledConditions
  */
  if (!handled && globalTopic.conditions) {
    for (const condition of globalTopic.conditions) {
      if (
        !context ||
        context.activeConditions.includes(condition.name) ||
        (context.activeConditions.length === 0 &&
          (context.disabledConditions.length === 0 ||
            !context.disabledConditions.includes(condition.name)))
      ) {
        [handled, handlerResult] = await runCondition(
          condition,
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

export function init<TMessage, TUserData>(
  allTopics: Array<ITopic<any, any, TMessage, TUserData | undefined>>,
  options: IInitOptions = {}
): TopicsHandler<TMessage, TUserData | undefined> {
  return async function doInit(
    input: TMessage,
    contexts = { items: [], virgin: true },
    userData = undefined
  ): Promise<IResponse<TMessage, TUserData>> {
    const globalTopic: ITopic<
      any,
      any,
      TMessage,
      TUserData | undefined
    > = findTopic("global", allTopics);
    const topics = allTopics.filter(t => t.name !== "global");

    const globalContext: ITopicContext<any, TMessage, TUserData | undefined> = {
      activeConditions: [],
      disabledConditions: [],
      topic: globalTopic
    };

    if (contexts.virgin) {
      contexts.virgin = false;
      const mainTopic: ITopic<
        any,
        any,
        TMessage,
        TUserData | undefined
      > = findTopic("main", topics);
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
