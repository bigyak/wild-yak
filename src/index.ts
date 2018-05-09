export interface ITopicCtor<T> {
  new (): T;
}

export interface IEvalState<TMessage, TUserData, THost> {
  topics: ITopic<TMessage, TUserData, THost>[];
  rootTopic: ITopic<TMessage, TUserData, THost>;
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
}

export interface IHandlerResult {
  handled: boolean;
  result?: any;
}

export interface ITopic<TMessage, TUserData, THost> {
  handle(
    state: IEvalState<TMessage, TUserData, THost>,
    message: TMessage,
    userData: TUserData,
    host: THost
  ): Promise<IHandlerResult>;
  isTopLevel?(): boolean;
}

export abstract class TopicBase<TMessage, TUserData, THost> {
  enterTopic(
    evalState: IEvalState<TMessage, TUserData, THost>,
    topic: ITopic<TMessage, TUserData, THost>
  ) {
    const currentTopic = getActiveTopic(evalState);
    if (
      evalState.rootTopic === (this as any) ||
      currentTopic === (this as any)
    ) {
      evalState.topics.push(topic);
    } else {
      throw new Error(
        `The caller is not the currently active topic. This is an error in code.`
      );
    }
  }

  exitTopic(evalState: IEvalState<TMessage, TUserData, THost>) {
    const currentTopic = getActiveTopic(evalState);
    if (
      evalState.rootTopic === (this as any) ||
      currentTopic === (this as any)
    ) {
      evalState.topics.pop();
    } else {
      throw new Error(
        `The caller is not the currently active topic. This is an error in code.`
      );
    }
  }
}

interface ITopicMap<TMessage, TUserData, THost> {
  [key: string]: ITopicCtor<ITopic<TMessage, TUserData, THost>>;
}

function getActiveTopic<TMessage, TUserData, THost>(
  evalState: IEvalState<TMessage, TUserData, THost>
): ITopic<TMessage, TUserData, THost> {
  return evalState.topics.slice(-1)[0];
}

async function processMessage<TMessage, TUserData, THost>(
  evalState: IEvalState<TMessage, TUserData, THost>,
  message: TMessage,
  userData: TUserData,
  host: THost,
  rootTopic: ITopic<TMessage, TUserData, THost>
) {
  const activeTopic = getActiveTopic<TMessage, TUserData, THost>(evalState);
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

function toSerializable<TMessage, TUserData, THost>(
  state: IEvalState<TMessage, TUserData, THost>
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

function recreateTopicFromSerialized<TMessage, TUserData, THost>(
  ctor: ITopicCtor<ITopic<TMessage, TUserData, THost>>,
  source: { [key: string]: any }
) {
  const recreatedTopic: any = new ctor();
  const props = Object.keys(source);
  for (const prop of props) {
    recreatedTopic[prop] = source[prop];
  }
  return recreatedTopic;
}

function recreateEvalState<TMessage, TUserData, THost>(
  serializable: ISerializableEvalState,
  topicMap: ITopicMap<TMessage, TUserData, THost>,
  rootTopicCtor: ITopicCtor<ITopic<TMessage, TUserData, THost>>
): IEvalState<TMessage, TUserData, THost> {
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

function enterTopic<TMessage, TUserData, THost>(
  evalState: IEvalState<TMessage, TUserData, THost>,
  topic: ITopic<TMessage, TUserData, THost>
) {
  if (topic.isTopLevel && topic.isTopLevel()) {
    evalState.topics = [topic];
  } else {
    evalState.topics.push(topic);
  }
}

function exitTopic<TMessage, TUserData, THost>(
  evalState: IEvalState<TMessage, TUserData, THost>,
  current: ITopic<TMessage, TUserData, THost>
) {
  evalState.topics.pop();
}

export function init<TMessage, TUserData, THost>(
  rootTopicCtor: ITopicCtor<ITopic<TMessage, TUserData, THost>>,
  defaultTopicCtor: ITopicCtor<ITopic<TMessage, TUserData, THost>>,
  otherTopicCtors: ITopicCtor<ITopic<TMessage, TUserData, THost>>[]
) {
  const rootTopic = new rootTopicCtor();

  const topicMap: ITopicMap<TMessage, TUserData, THost> = [defaultTopicCtor]
    .concat(otherTopicCtors)
    .reduce(
      (acc: any, topicCtor: ITopicCtor<ITopic<TMessage, TUserData, THost>>) => {
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
    host: THost
  ) {
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
  };
}
