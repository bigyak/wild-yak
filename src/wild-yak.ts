/*
  Options passed in by the calling external program
*/
export interface IInitOptions {}

/*
  WildYak's response after an input is processed.
  We pass back the changed session also. 
  The caller should pass the same session back when calling again.
*/
export interface IResponse<TUserData> {
  contexts: IContexts<TUserData>;
  output: any[];
}

/*
  Definition of a Topic.
*/
export interface ITopic<TInitArgs, TContextData, TUserData>
  extends ITopicBase<TInitArgs, TContextData, TUserData> {
  isRoot: boolean;
  callbacks: { [key: string]: (state: any, params: any) => Promise<any> };
  conditions: Array<ICondition<TContextData, any, any, any, TUserData>>;
  afterInit?: (
    state: IApplicationState<TContextData, TUserData>
  ) => Promise<any | void>;
}

/*
  Context. This is where each topic stores its state.
*/
export interface ITopicContext<TContextData, TUserData> {
  data?: TContextData | void;
  activeConditions: Array<string>;
  disabledConditions: Array<string>;
  topic: ITopic<any, TContextData, TUserData>;
  parentTopic?: ITopic<any, any, TUserData>;
  cb?: Function;
}

/*
  Contexts contain all the contexts.
*/
export interface IContexts<TUserData> {
  items: Array<ITopicContext<any, TUserData>>;
  virgin: boolean;
}

/*
  Conditions have predicates, which take an input and decide whether anything needs to be done with it.
  If the parser returns a value, it is passed on to the handler. If the result is undefined, skip this condition.
*/
export type Predicate<TContextData, TInput, TParseResult, TUserData> = (
  state: IApplicationState<TContextData, TUserData>,
  input: TInput
) => Promise<TParseResult | void>;

/*
  Recieves a ParseResult from the parse() function. 
  Handler can optionally return a result.
*/
export type HandlerFunc<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TUserData
> = (
  state: IApplicationState<TContextData, TUserData>,
  args: TParseResult
) => Promise<TOutboundMessage>;

/*
  The Condition. Contains a name, a predicate and a handler.
*/
export interface ICondition<
  TContextData,
  TInput,
  TParseResult,
  TOutboundMessage,
  TUserData
> {
  name: string;
  predicate: Predicate<TContextData, TInput, TParseResult, TUserData>;
  handler: HandlerFunc<TContextData, TParseResult, TOutboundMessage, TUserData>;
}

/*
  State that is passed into every function.
  Contains a context and an external userData.
  The external userData helps the topic work with application state.
  eg: userData.shoppingCart.items.count
*/
export interface IApplicationState<TContextData, TUserData> {
  context: ITopicContext<TContextData, TUserData>;
  contexts: IContexts<TUserData>;
  userData: TUserData;
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
export type TopicsHandler<TUserData> = (
  input: any,
  contexts: IContexts<TUserData>,
  userData: TUserData
) => Promise<IResponse<TUserData>>;

export interface ITopicBase<TInitArgs, TContextData, TUserData> {
  name: string;
  init: (
    args: TInitArgs,
    userData: TUserData
  ) => Promise<TContextData | void>;
}

export function createTopic<TInitArgs, TContextData, TUserData>(
  name: string,
  topicInit: (
    args: TInitArgs,
    userData: TUserData
  ) => Promise<TContextData | void>
) {
  const topic = {
    init: topicInit,
    name
  };

  return completeTopic(topic);
}

function completeTopic<TInitArgs, TContextData, TUserData>(
  topic: ITopicBase<TInitArgs, TContextData, TUserData>
) {
  return (options: {
    isRoot?: boolean;
    conditions?: Array<ICondition<TContextData, any, any, any, TUserData>>;
    callbacks?: {
      [key: string]: (
        state: IApplicationState<TContextData, TUserData>,
        params: any
      ) => Promise<any | void>;
    };
    afterInit?: (
      state: IApplicationState<TContextData, TUserData>
    ) => Promise<any | void>;
  }): ITopic<TInitArgs, TContextData, TUserData> => {
    return {
      afterInit: options.afterInit,
      callbacks: options.callbacks || {},
      conditions: options.conditions || [],
      isRoot: typeof options.isRoot !== "undefined" ? options.isRoot : false,
      ...topic
    };
  };
}

export function regexParse<TContextData, TInput, TUserData>(
  patterns: Array<RegExp>,
  inputToString: (input: TInput) => string
) {
  return async (
    state: IApplicationState<TContextData, TUserData>,
    input: TInput
  ): Promise<IRegexParseResult<TInput> | void> => {
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
  TInput,
  TParseResult,
  TOutboundMessage,
  TUserData
>(
  name: string,
  predicate: Predicate<TContextData, TInput, TParseResult, TUserData>,
  handler: HandlerFunc<TContextData, TParseResult, TOutboundMessage, TUserData>
): ICondition<TContextData, TInput, TParseResult, TOutboundMessage, TUserData> {
  return {
    handler,
    name,
    predicate
  };
}

export function activeContext<TUserData>(
  contexts: IContexts<TUserData>
): ITopicContext<any, TUserData> {
  return contexts.items.slice(-1)[0];
}

function findTopic<TUserData>(
  name: string,
  topics: Array<ITopic<any, any, TUserData>>
): ITopic<any, any, TUserData> {
  return topics.filter(t => t.name === name)[0];
}

export async function enterTopic<
  TParentInitArgs,
  TParentContextData,
  TNewInitArgs,
  TNewContextData,
  TCallbackArgs,
  TCallbackResult,
  TUserData
>(
  state: IApplicationState<TParentContextData, TUserData>,
  newTopic: ITopic<TNewInitArgs, TNewContextData, TUserData>,
  parentTopic: ITopic<TParentInitArgs, TParentContextData, TUserData>,
  args: TNewInitArgs,
  cb?: HandlerFunc<
    TParentContextData,
    TCallbackArgs,
    TCallbackResult,
    TUserData
  >
): Promise<void> {
  const { context: currentContext, contexts, userData } = state;

  const contextOnStack = activeContext(contexts);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ITopicContext<TNewContextData, TUserData> = {
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

export async function exitTopic<TContextData, TUserData>(
  state: IApplicationState<TContextData, TUserData>,
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

export async function clearAllTopics<TContextData, TUserData>(
  state: IApplicationState<TContextData, TUserData>
): Promise<void> {
  const { context, contexts, userData } = state;

  if (context !== activeContext(contexts)) {
    throw new Error("You can only exit from the current context.");
  }

  contexts.items = [];
}

export function disableConditionsExcept<TContextData, TUserData>(
  state: IApplicationState<TContextData, TUserData>,
  list: Array<string>
): void {
  state.context.activeConditions = list;
}

export function disableConditions<TContextData, TUserData>(
  state: IApplicationState<TContextData, TUserData>,
  list: Array<string>
): void {
  state.context.disabledConditions = list;
}

async function runCondition<
  TContextData,
  TInput,
  TParseResult,
  TOutboundMessage,
  TUserData
>(
  condition: ICondition<
    TContextData,
    TInput,
    TParseResult,
    TOutboundMessage,
    TUserData
  >,
  state: IApplicationState<TContextData, TUserData>,
  input: TInput
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

async function processMessage<TInboundMessage, TOutboundMessage, TUserData>(
  input: any,
  contexts: IContexts<TUserData>,
  userData: TUserData,
  globalContext: ITopicContext<any, TUserData>,
  globalTopic: ITopic<any, any, TUserData>,
  topics: Array<ITopic<any, any, TUserData>>
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

export function init<TUserData>(
  allTopics: Array<ITopic<any, any, TUserData>>,
  options: IInitOptions = {}
): TopicsHandler<TUserData> {
  return async function doInit(
    input: any,
    contexts = { items: [], virgin: true },
    userData: TUserData = undefined as any
  ): Promise<IResponse<TUserData>> {
    const globalTopic: ITopic<any, any, TUserData> = findTopic(
      "global",
      allTopics
    );
    const topics = allTopics.filter(t => t.name !== "global");

    const globalContext: ITopicContext<any, TUserData> = {
      activeConditions: [],
      disabledConditions: [],
      topic: globalTopic
    };

    if (contexts.virgin) {
      contexts.virgin = false;
      const mainTopic: ITopic<any, any, TUserData> = findTopic(
        "main",
        topics
      );
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
