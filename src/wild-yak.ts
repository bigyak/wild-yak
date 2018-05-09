export type Maybe<T> = T | undefined;

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
  contexts: ISerializableContexts;
  output: any[];
}

export interface ICallbacks<TMessage, TUserData> {
  [key: string]: (
    state: IApplicationState<any, TMessage, TUserData>,
    args: any
  ) => any;
}

/*
  Definition of a Topic.
*/
export interface ITopic<TInitArgs, TContextData, TMessage, TUserData>
  extends ITopicBase<TInitArgs, TContextData, TUserData> {
  isRoot: boolean;
  callbacks: Maybe<ICallbacks<TMessage, TUserData>>;
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
  cb?: (state: IApplicationState<any, TMessage, TUserData>, args: any) => any;
}

export interface ISerializableTopicContext<TContextData> {
  data?: TContextData | void;
  activeConditions: Array<string>;
  disabledConditions: Array<string>;
  topic: string;
  parentTopic?: string;
  cb?: string;
}

/*
  Contexts contain all the contexts.
*/
export interface IContexts<TMessage, TUserData> {
  items: Array<ITopicContext<any, TMessage, TUserData>>;
  virgin: boolean;
}

export interface ISerializableContexts {
  items: Array<ISerializableTopicContext<any>>;
  virgin: boolean;
}

/*
  Conditions have predicates, which take an input and decide whether anything needs to be done with it.
  If the parser returns a value, it is passed on to the handler. If the result is undefined, skip this condition.
*/
export type Predicate<TContextData, TParseResult, TMessage, TUserData> = (
  state: IApplicationState<TContextData, TMessage, TUserData>,
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
  state: IApplicationState<TContextData, TMessage, TUserData>,
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
  predicate: Predicate<TContextData, TParseResult, TMessage, TUserData>;
  handler: HandlerFunc<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TUserData
  >;
}

/*
  State that is passed into every function.
  Contains a context and an external userData.
  The external userData helps the topic work with application state.
  eg: userData.shoppingCart.items.count
*/
export interface IApplicationState<TContextData, TMessage, TUserData> {
  context: ITopicContext<TContextData, TMessage, TUserData>;
  contexts: IContexts<TMessage, TUserData>;
  userData: Maybe<TUserData>;
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
  serializedContexts?: ISerializableContexts,
  userData?: Maybe<TUserData>
) => Promise<IResponse<TMessage, TUserData>>;

export interface ITopicBase<TInitArgs, TContextData, TUserData> {
  name: string;
  init: (
    args: TInitArgs,
    userData: Maybe<TUserData>
  ) => Promise<TContextData | void>;
}

export function createTopic<TMessage, TUserData>() {
  return <TInitArgs, TContextData>(
    name: string,
    topicInit: (
      args: TInitArgs,
      userData: Maybe<TUserData>
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
  topic: ITopicBase<TInitArgs, TContextData, TUserData>
) {
  return (options: {
    isRoot?: boolean;
    conditions?: Array<ICondition<TContextData, any, any, TMessage, TUserData>>;
    callbacks?: ICallbacks<TMessage, TUserData>;
    afterInit?: (
      state: IApplicationState<TContextData, TMessage, TUserData>
    ) => Promise<any | void>;
  }): ITopic<TInitArgs, TContextData, TMessage, TUserData> => {
    return {
      afterInit: options.afterInit,
      callbacks: options.callbacks,
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
  predicate: Predicate<TContextData, TParseResult, TMessage, TUserData>,
  handler: HandlerFunc<
    TContextData,
    TParseResult,
    TOutboundMessage,
    TMessage,
    TUserData
  >
): ICondition<
  TContextData,
  TParseResult,
  TOutboundMessage,
  TMessage,
  TUserData
> {
  return {
    handler,
    name,
    predicate
  };
}

export function activeContext<TMessage, TUserData>(
  contexts: IContexts<TMessage, TUserData>
): ITopicContext<any, TMessage, TUserData> {
  return contexts.items.slice(-1)[0];
}

function findTopic<TMessage, TUserData>(
  name: string,
  topics: Array<ITopic<any, any, TMessage, TUserData>>
): ITopic<any, any, TMessage, TUserData> {
  return topics.filter(t => t.name === name)[0];
}

export async function enterTopic<
  TNewInitArgs,
  TNewContextData,
  TParentInitArgs,
  TParentContextData,
  TCallbackArgs,
  TCallbackResult,
  TMessage,
  TUserData,
  TTopic extends ITopic<TNewInitArgs, TNewContextData, TMessage, TUserData>,
  TParentTopic extends ITopic<
    TParentInitArgs,
    TParentContextData,
    TMessage,
    TUserData
  >
>(
  state: IApplicationState<TParentContextData, TMessage, TUserData>,
  newTopic: TTopic,
  parentTopic: TParentTopic,
  args: TNewInitArgs,
  cbSelector?: (
    callbacks: ICallbacks<TMessage, TUserData>
  ) => (state: IApplicationState<any, TMessage, TUserData>, args: any) => any
): Promise<void> {
  const { context: currentContext, contexts, userData } = state;

  const contextOnStack = activeContext(contexts);

  if (contextOnStack && state.context !== contextOnStack) {
    throw new Error("You can only enter a new context from the last context.");
  }

  const newContext: ITopicContext<TNewContextData, TMessage, TUserData> = {
    activeConditions: [],
    cb:
      cbSelector && parentTopic.callbacks
        ? cbSelector(parentTopic.callbacks)
        : undefined,
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
  state: IApplicationState<TContextData, TMessage, TUserData>,
  args: any
): Promise<any> {
  const { context, contexts, userData } = state;

  if (context === activeContext(contexts)) {
    const lastContext = contexts.items.pop();

    if (lastContext && lastContext.cb) {
      const cb = lastContext.cb;
      return await cb(
        {
          context: activeContext(contexts),
          contexts,
          userData: state.userData
        },
        args
      );
    }
  } else {
    throw new Error("You can only exit from the current context.");
  }
}

export async function clearAllTopics<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData>
): Promise<void> {
  const { context, contexts, userData } = state;

  if (context === activeContext(contexts)) {
    contexts.items = [];
  } else {
    throw new Error("You can only exit from the current context.");
  }
}

export function disableConditionsExcept<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData>,
  list: Array<string>
): void {
  state.context.activeConditions = list;
}

export function disableConditions<TContextData, TMessage, TUserData>(
  state: IApplicationState<TContextData, TMessage, TUserData>,
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
    TUserData
  >,
  state: IApplicationState<TContextData, TMessage, TUserData>,
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
  contexts: IContexts<TMessage, TUserData>,
  userData: Maybe<TUserData>,
  globalContext: ITopicContext<any, TMessage, TUserData>,
  globalTopic: ITopic<any, any, TMessage, TUserData>,
  topics: Array<ITopic<any, any, TMessage, TUserData>>
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
  allTopics: Array<ITopic<any, any, TMessage, TUserData>>,
  options: IInitOptions = {}
): TopicsHandler<TMessage, TUserData> {
  /*
    Convert the contexts to serializable form before responding.
    This allows the host to store it somewhere, like a database.
    What it actually means is that we remove things that aren't serializable, such as function instances.
  */
  function toSerializableContexts(contexts: IContexts<TMessage, TUserData>) {
    const serializableContexts: ISerializableContexts = {
      items: contexts.items.map(c => {
        return {
          activeConditions: c.activeConditions,
          cb: c.cb ? c.cb.name : undefined,
          data: c.data,
          disabledConditions: c.disabledConditions,
          parentTopic: c.parentTopic ? c.parentTopic.name : undefined,
          topic: c.topic.name
        };
      }),
      virgin: contexts.virgin
    };
    return serializableContexts;
  }

  /*
    Contexts we receive for each call to handler will be in serialized form.
    Need to reconstruct.
  */
  function reconstructContexts(serializableContexts: ISerializableContexts) {
    const contexts: IContexts<TMessage, TUserData> = {
      items: serializableContexts.items.map(c => {
        const topic = findTopic(c.topic, allTopics);
        const parentTopic = c.parentTopic
          ? findTopic(c.parentTopic, allTopics)
          : undefined;
        return {
          activeConditions: c.activeConditions,
          cb:
            c.cb && parentTopic && parentTopic.callbacks
              ? parentTopic.callbacks[c.cb]
              : undefined,
          data: c.data,
          disabledConditions: c.disabledConditions,
          parentTopic,
          topic
        };
      }),
      virgin: serializableContexts.virgin
    };
    return contexts;
  }

  const topics = allTopics.filter(t => t.name !== "global");

  const globalTopic: ITopic<any, any, TMessage, TUserData> = findTopic(
    "global",
    allTopics
  );

  const mainTopic: ITopic<any, any, TMessage, TUserData> = findTopic(
    "main",
    topics
  );

  const globalContext: ITopicContext<any, TMessage, TUserData> = {
    activeConditions: [],
    disabledConditions: [],
    topic: globalTopic
  };

  return async function doInit(
    input: TMessage,
    contextsSerializedByHost = { items: [], virgin: true },
    userData: Maybe<TUserData> = undefined
  ): Promise<IResponse<TMessage, TUserData>> {
    const contexts = reconstructContexts(contextsSerializedByHost);

    if (contexts.virgin) {
      contexts.virgin = false;
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
      contexts: toSerializableContexts(contexts),
      output: results
    };
  };
}
