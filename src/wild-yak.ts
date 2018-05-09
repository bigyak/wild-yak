/*
  Options passed in by the calling external program
*/
export interface IInitOptions {}

/*
  WildYak's response after an input is processed.
  We pass back the changed session also. 
  The caller should pass the same session back when calling again.
*/
export interface IResponse<TMessage, TExternalContext> {
  contexts: IContexts<TMessage, TExternalContext>;
  output: any[];
}

/*
  Definition of a Topic.
*/
export interface ITopic<TInitArgs, TContextData, TMessage, TExternalContext>
  extends ITopicBase<TInitArgs, TContextData, TExternalContext> {
  isRoot: boolean;
  callbacks: { [key: string]: (state: any, params: any) => Promise<any> };
  conditions: Array<ICondition<TContextData, any, any, TMessage, TExternalContext>>;
  afterInit?: (
    state: IApplicationState<TContextData, TMessage, TExternalContext>
  ) => Promise<any | void>;
}

/*
  Context. This is where each topic stores its state.
*/
export interface ITopicContext<TContextData, TMessage, TExternalContext> {
  data?: TContextData | void;
  activeConditions: Array<string>;
  disabledConditions: Array<string>;
  topic: ITopic<any, TContextData, TMessage, TExternalContext>;
  parentTopic?: ITopic<any, any, TMessage, TExternalContext>;
  cb?: Function;
}

/*
  Contexts contain all the contexts.
*/
export interface IContexts<TMessage, TExternalContext> {
  items: Array<ITopicContext<any, TMessage, TExternalContext>>;
  virgin: boolean;
}

/*
  Conditions have predicates, which take an input and decide whether anything needs to be done with it.
  If the parser returns a value, it is passed on to the handler. If the result is undefined, skip this condition.
*/
export type Predicate<TContextData, TParseResult, TMessage, TExternalContext> = (
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
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
  TExternalContext
> = (
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
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
  TExternalContext
> {
  name: string;
  predicate: Predicate<
    TContextData,
    TParseResult,
    TMessage,
    TExternalContext | undefined
  >;
  handler: HandlerFunc<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TExternalContext | undefined
  >;
}

/*
  State that is passed into every function.
  Contains a context and an external externalContext.
  The external externalContext helps the topic work with application state.
  eg: externalContext.shoppingCart.items.count
*/
export interface IApplicationState<TContextData, TMessage, TExternalContext> {
  context: ITopicContext<TContextData, TMessage, TExternalContext | undefined>;
  contexts: IContexts<TMessage, TExternalContext | undefined>;
  externalContext: TExternalContext | undefined;
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
export type TopicsHandler<TMessage, TExternalContext> = (
  input: TMessage,
  contexts?: IContexts<TMessage, TExternalContext | undefined>,
  externalContext?: TExternalContext
) => Promise<IResponse<TMessage, TExternalContext>>;

export interface ITopicBase<TInitArgs, TContextData, TExternalContext> {
  name: string;
  init: (
    args?: TInitArgs,
    externalContext?: TExternalContext
  ) => Promise<TContextData | void>;
}

export function createTopic<TMessage, TExternalContext>() {
  return <TInitArgs, TContextData>(
    name: string,
    topicInit: (
      args?: TInitArgs,
      externalContext?: TExternalContext
    ) => Promise<TContextData | void>
  ) => {
    const topic = {
      init: topicInit,
      name
    };

    return completeTopic<TInitArgs, TContextData, TMessage, TExternalContext>(topic);
  };
}

function completeTopic<TInitArgs, TContextData, TMessage, TExternalContext>(
  topic: ITopicBase<TInitArgs, TContextData, TExternalContext | undefined>
) {
  return (options: {
    isRoot?: boolean;
    conditions?: Array<
      ICondition<TContextData, any, any, TMessage, TExternalContext | undefined>
    >;
    callbacks?: {
      [key: string]: (
        state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
        params: any
      ) => Promise<any | void>;
    };
    afterInit?: (
      state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>
    ) => Promise<any | void>;
  }): ITopic<TInitArgs, TContextData, TMessage, TExternalContext | undefined> => {
    return {
      afterInit: options.afterInit,
      callbacks: options.callbacks || {},
      conditions: options.conditions || [],
      isRoot: typeof options.isRoot !== "undefined" ? options.isRoot : false,
      ...topic
    };
  };
}

export function regexParse<TContextData, TMessage, TExternalContext>(
  patterns: Array<RegExp>,
  inputToString: (input: TMessage) => string
) {
  return async (
    state: IApplicationState<TContextData, TMessage, TExternalContext>,
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
  TExternalContext
>(
  name: string,
  predicate: Predicate<
    TContextData,
    TParseResult,
    TMessage,
    TExternalContext | undefined
  >,
  handler: HandlerFunc<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TExternalContext | undefined
  >
): ICondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TExternalContext | undefined
> {
  return {
    handler,
    name,
    predicate
  };
}

export function activeContext<TMessage, TExternalContext>(
  contexts: IContexts<TMessage, TExternalContext | undefined>
): ITopicContext<any, TMessage, TExternalContext | undefined> {
  return contexts.items.slice(-1)[0];
}

function findTopic<TMessage, TExternalContext>(
  name: string,
  topics: Array<ITopic<any, any, TMessage, TExternalContext | undefined>>
): ITopic<any, any, TMessage, TExternalContext | undefined> {
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
  TExternalContext
>(
  state: IApplicationState<TParentContextData, TMessage, TExternalContext | undefined>,
  newTopic: ITopic<
    TNewInitArgs,
    TNewContextData,
    TMessage,
    TExternalContext | undefined
  >,
  parentTopic: ITopic<
    TParentInitArgs,
    TParentContextData,
    TMessage,
    TExternalContext | undefined
  >,
  args?: TNewInitArgs,
  cb?: HandlerFunc<
    TParentContextData,
    TCallbackArgs,
    TCallbackResult,
    TMessage,
    TExternalContext
  >
): Promise<void> {
  const { context: currentContext, contexts, externalContext } = state;

  const contextOnStack = activeContext(contexts);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ITopicContext<
    TNewContextData,
    TMessage,
    TExternalContext | undefined
  > = {
    activeConditions: [],
    cb,
    data: await newTopic.init(args, externalContext),
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
    await newTopic.afterInit({ context: newContext, contexts, externalContext });
  }
}

export async function exitTopic<TContextData, TMessage, TExternalContext>(
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
  args?: any
): Promise<any> {
  const { context, contexts, externalContext } = state;

  if (context !== activeContext(contexts)) {
    throw new Error("You can only exit from the current context.");
  }

  const lastContext = contexts.items.pop();

  if (lastContext && lastContext.cb) {
    const cb = lastContext.cb;
    const parentContext = activeContext(contexts);
    return await cb(
      { context: parentContext, contexts, externalContext: state.externalContext },
      args
    );
  }
}

export async function clearAllTopics<TContextData, TMessage, TExternalContext>(
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>
): Promise<void> {
  const { context, contexts, externalContext } = state;

  if (context !== activeContext(contexts)) {
    throw new Error("You can only exit from the current context.");
  }

  contexts.items = [];
}

export function disableConditionsExcept<TContextData, TMessage, TExternalContext>(
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
  list: Array<string>
): void {
  state.context.activeConditions = list;
}

export function disableConditions<TContextData, TMessage, TExternalContext>(
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
  list: Array<string>
): void {
  state.context.disabledConditions = list;
}

async function runCondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TExternalContext
>(
  condition: ICondition<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TExternalContext | undefined
  >,
  state: IApplicationState<TContextData, TMessage, TExternalContext | undefined>,
  input: TMessage
): Promise<[boolean, TOutboundMessage] | [false, any]> {
  const { context, externalContext } = state;
  const parseResult = await condition.predicate(state, input);
  if (parseResult !== undefined) {
    const handlerResult = await condition.handler(state, parseResult);
    return [true, handlerResult];
  } else {
    return [false, undefined];
  }
}

async function processMessage<TOutboundMessage, TMessage, TExternalContext>(
  input: any,
  contexts: IContexts<TMessage, TExternalContext | undefined>,
  externalContext: TExternalContext | undefined,
  globalContext: ITopicContext<any, TMessage, TExternalContext | undefined>,
  globalTopic: ITopic<any, any, TMessage, TExternalContext | undefined>,
  topics: Array<ITopic<any, any, TMessage, TExternalContext | undefined>>
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
          { context, contexts, externalContext },
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
          { context: context || globalContext, contexts, externalContext },
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

export function init<TMessage, TExternalContext>(
  allTopics: Array<ITopic<any, any, TMessage, TExternalContext | undefined>>,
  options: IInitOptions = {}
): TopicsHandler<TMessage, TExternalContext | undefined> {
  return async function doInit(
    input: TMessage,
    contexts = { items: [], virgin: true },
    externalContext = undefined
  ): Promise<IResponse<TMessage, TExternalContext>> {
    const globalTopic: ITopic<
      any,
      any,
      TMessage,
      TExternalContext | undefined
    > = findTopic("global", allTopics);
    const topics = allTopics.filter(t => t.name !== "global");

    const globalContext: ITopicContext<any, TMessage, TExternalContext | undefined> = {
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
        TExternalContext | undefined
      > = findTopic("main", topics);
      if (mainTopic) {
        await enterTopic(
          { context: globalContext, contexts, externalContext },
          mainTopic,
          globalTopic,
          undefined
        );
      }
    }

    const results = await processMessage(
      input,
      contexts,
      externalContext,
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
