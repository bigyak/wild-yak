export interface ITopicCtor<T> {
  new (): T;
}

export interface IEvalState<TMessage, TResult, TUserData, THost> {
  topics: ITopic<TMessage, TResult, TUserData, THost>[];
  rootTopic: ITopic<TMessage, TResult, TUserData, THost>;
  virgin: boolean;
}

export interface ISerializableTopic {
  ctor: string;
  props: {
    [key: string]: any;
  };
}

export interface ISerializableEvalState {
  topics: ISerializableTopic[];
  rootTopic: ISerializableTopic;
  virgin: boolean;
  used?: boolean;
}

export interface IHandlerResult<TResult> {
  handled: boolean;
  result?: TResult;
}

export interface ITopic<TMessage, TResult, TUserData, THost> {
  handle(
    state: IEvalState<TMessage, TResult, TUserData, THost>,
    message: TMessage,
    userData: TUserData,
    host: THost
  ): Promise<IHandlerResult<TResult>>;
  isTopLevel?(): boolean;
}

export abstract class TopicBase<TMessage, TResult, TUserData, THost> {
  enterTopic(
    evalState: IEvalState<TMessage, TResult, TUserData, THost>,
    topic: ITopic<TMessage, TResult, TUserData, THost>
  ) {
    const currentTopic = getActiveTopic(evalState);
    if (
      evalState.rootTopic === (this as any) ||
      currentTopic === (this as any)
    ) {
      enterTopic(evalState, topic);
    } else {
      throw new Error(
        `The caller is not the currently active topic. This is an error in code.`
      );
    }
  }

  exitTopic(evalState: IEvalState<TMessage, TResult, TUserData, THost>) {
    const currentTopic = getActiveTopic(evalState);
    if (
      evalState.rootTopic === (this as any) ||
      currentTopic === (this as any)
    ) {
      exitTopic(evalState);
    } else {
      throw new Error(
        `The caller is not the currently active topic. This is an error in code.`
      );
    }
  }
}

interface ITopicMap<TMessage, TResult, TUserData, THost> {
  [key: string]: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>;
}

function getActiveTopic<TMessage, TResult, TUserData, THost>(
  evalState: IEvalState<TMessage, TResult, TUserData, THost>
): ITopic<TMessage, TResult, TUserData, THost> {
  return evalState.topics.slice(-1)[0];
}

async function processMessage<TMessage, TResult, TUserData, THost>(
  evalState: IEvalState<TMessage, TResult, TUserData, THost>,
  message: TMessage,
  userData: TUserData,
  host: THost,
  rootTopic: ITopic<TMessage, TResult, TUserData, THost>
) {
  const activeTopic = getActiveTopic<TMessage, TResult, TUserData, THost>(
    evalState
  );
  const { handled, result } = await activeTopic.handle(
    evalState,
    message,
    userData,
    host
  );
  if (handled) {
    return { handled, result };
  } else {
    return await rootTopic.handle(evalState, message, userData, host);
  }
}

function toSerializable<TMessage, TResult, TUserData, THost>(
  state: IEvalState<TMessage, TResult, TUserData, THost>
) {
  return {
    rootTopic: {
      ctor: state.rootTopic.constructor.name,
      props: { ...state.rootTopic }
    },
    topics: state.topics.map(c => ({
      ctor: c.constructor.name,
      props: { ...c }
    })),
    virgin: state.virgin
  };
}

function recreateTopicFromSerialized<TMessage, TResult, TUserData, THost>(
  ctor: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>,
  source: { [key: string]: any }
) {
  const recreatedTopic: any = new ctor();
  const props = Object.keys(source);
  for (const prop of props) {
    recreatedTopic[prop] = source[prop];
  }
  return recreatedTopic;
}

function recreateEvalState<TMessage, TResult, TUserData, THost>(
  serializable: ISerializableEvalState,
  topicMap: ITopicMap<TMessage, TResult, TUserData, THost>,
  rootTopicCtor: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>
): IEvalState<TMessage, TResult, TUserData, THost> {
  return {
    rootTopic: recreateTopicFromSerialized(
      rootTopicCtor,
      serializable.rootTopic
    ),
    topics: serializable.topics.map(c =>
      recreateTopicFromSerialized(topicMap[c.ctor], c.props)
    ),
    virgin: serializable.virgin
  };
}

function enterTopic<TMessage, TResult, TUserData, THost>(
  evalState: IEvalState<TMessage, TResult, TUserData, THost>,
  topic: ITopic<TMessage, TResult, TUserData, THost>
) {
  if (topic.isTopLevel && topic.isTopLevel()) {
    evalState.topics = [topic];
  } else {
    evalState.topics.push(topic);
  }
}

function exitTopic<TMessage, TResult, TUserData, THost>(
  evalState: IEvalState<TMessage, TResult, TUserData, THost>
) {
  evalState.topics.pop();
}

export function init<TMessage, TResult, TUserData, THost>(
  rootTopicCtor: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>,
  defaultTopicCtor: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>,
  otherTopicCtors: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>[]
) {
  const rootTopic = new rootTopicCtor();

  const topicMap: ITopicMap<TMessage, TResult, TUserData, THost> = [
    defaultTopicCtor
  ]
    .concat(otherTopicCtors)
    .reduce(
      (
        acc: any,
        topicCtor: ITopicCtor<ITopic<TMessage, TResult, TUserData, THost>>
      ) => {
        acc[topicCtor.name] = topicCtor;
        return acc;
      },
      {}
    );

  return async function handler(
    message: TMessage,
    stateSerializedByHost: ISerializableEvalState = {
      rootTopic: {
        ctor: rootTopic.constructor.name,
        props: rootTopic
      },
      topics: [],
      virgin: true
    },
    userData: TUserData,
    host: THost,
    options: { reuseState: boolean } = { reuseState: false }
  ): Promise<{ result: any; state: ISerializableEvalState }> {
    if (options.reuseState || !stateSerializedByHost.used) {
      stateSerializedByHost.used = true;

      const evalState = recreateEvalState(
        stateSerializedByHost,
        topicMap,
        rootTopicCtor
      );

      if (evalState.virgin) {
        evalState.virgin = false;
        enterTopic(evalState, new defaultTopicCtor());
      }

      const { handled, result } = await processMessage(
        evalState,
        message,
        userData,
        host,
        evalState.rootTopic
      );

      return {
        result,
        state: toSerializable(evalState)
      };
    } else {
      throw new Error(
        "This evaluation state was previously used."
      );
    }
  };
}
