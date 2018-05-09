import {
  clearAllTopics,
  createCondition,
  createTopic,
  disableConditions,
  disableConditionsExcept,
  enterTopic,
  exitTopic,
  IApplicationState,
  ITopic,
  regexParse
} from "../wild-yak";

export interface IGetTopicsOptions {
  includeMain: boolean;
}

export interface IMessage {
  timestamp?: number;
  text: string;
}

export interface IUserData {
  x: number;
}

export interface IEnvType {
  _mainState: any;
  _enteredMain: boolean;
  _enteredNickname: boolean;
  _enteredMath: boolean;
  _enteredWildcard: boolean;
  _enteredMathExp: boolean;
  _enteredSignup: boolean;
  _enteredValidate: boolean;
  _enteredOnValidateName: boolean;
  _enteredDefault: boolean;
  _clearAllTopics: boolean;
  _enabled?: string[];
  _disabled?: string[];
  enterTopic_assertTopContextTest?: boolean;
  exitTopic_assertTopContextTest?: boolean;
}

function regex<TContextData, TUserData>(patterns: Array<RegExp>) {
  return regexParse<TContextData, IMessage, TUserData>(patterns, x => x.text);
}

export default function getTopics(options?: IGetTopicsOptions) {
  const env: IEnvType = {
    _clearAllTopics: false,
    _enteredDefault: false,
    _enteredMain: false,
    _enteredMath: false,
    _enteredMathExp: false,
    _enteredNickname: false,
    _enteredOnValidateName: false,
    _enteredSignup: false,
    _enteredValidate: false,
    _enteredWildcard: false,
    _mainState: {} // FIXME
  };

  const mainTopic = createTopic<IMessage, IUserData>()(
    "main",
    async (args: any, userData) => {
      env._enteredMain = true;
    }
  )({
    afterInit: async state => {
      if (
        env.enterTopic_assertTopContextTest ||
        env.exitTopic_assertTopContextTest
      ) {
        env._mainState = state;
        await enterTopic(state, nicknameTopic, mainTopic);
      }
    },
    conditions: [
      createCondition(
        "respond-to-hello",
        regex([/^Hello (.*)$/]),
        async (state, { matches }) => {
          return "hey, what's up!";
        }
      ),
      createCondition(
        "boomshanker",
        async (state, message) => {
          if (message && message.text === "Boomshanker") {
            return "zomg!";
          }
        },
        async (state, zomg) => {
          return `omg ${zomg}`;
        }
      )
    ],
    isRoot: true
  });

  const nicknameTopic = createTopic<IMessage, IUserData>()(
    "nickname",
    async (args, userData) => {
      env._enteredNickname = true;
    }
  )({
    afterInit: async () => {
      if (env.enterTopic_assertTopContextTest) {
        await enterTopic(env._mainState, defaultTopic, mathTopic);
      }

      if (env.exitTopic_assertTopContextTest) {
        await exitTopic(env._mainState);
      }
    },
    isRoot: true
  });

  const mathTopic = createTopic<IMessage, IUserData>()(
    "math",
    async (args, userData) => {
      env._enteredMath = true;
      return { x: 10 };
    }
  )({
    isRoot: true
  });

  const wildcardTopic = createTopic<IMessage, IUserData>()(
    "wildcard",
    async (args, userData) => {
      env._enteredWildcard = true;
    }
  )({
    afterInit: async state => {
      if (env._disabled !== undefined) {
        disableConditions(state, env._disabled);
      }
      if (env._enabled !== undefined) {
        disableConditionsExcept(state, env._enabled);
      }
    },
    isRoot: true
  });

  const mathExpTopic = createTopic<IMessage, IUserData>()(
    "mathexp",
    async (args, userData) => {
      env._enteredMathExp = true;
    }
  )({
    isRoot: true
  });

  async function onValidateName(
    state: IApplicationState<any, IMessage, IUserData | undefined>,
    args: { success: boolean; name: string }
  ) {
    const { success, name } = args;
    env._enteredOnValidateName = true;
    return `you signed up as ${name}.`;
  }

  const signupTopic = createTopic<IMessage, IUserData>()(
    "signup",
    async (args, userData) => {
      env._enteredSignup = true;
    }
  )({
    callbacks: {
      onValidateName
    },
    conditions: [
      createCondition(
        "validate",
        regex([/^name$/]),
        async (state, { matches }) => {
          await enterTopic(
            state,
            validateTopic,
            signupTopic,
            { P: true },
            onValidateName
          );
        }
      )
    ],
    isRoot: true
  });

  const validateTopic = createTopic<IMessage, IUserData>()(
    "validate",
    async (args: { P: boolean } | undefined, userData) => {
      env._enteredValidate = true;
    }
  )({
    conditions: [
      createCondition(
        "validate",
        regex([/^name (.*)$/]),
        async (state, { matches }) => {
          if (!env._clearAllTopics) {
            await exitTopic(state, { success: true });
          } else {
            await clearAllTopics(state);
          }
        }
      )
    ]
  });

  const defaultTopic = createTopic<IMessage, IUserData>()(
    "default",
    async (args, userData) => {
      env._enteredDefault = true;
    }
  )({
    isRoot: false
  });

  const globalTopic = createTopic<IMessage, IUserData>()(
    "global",
    async (args, userData) => undefined
  )({
    conditions: [
      createCondition(
        "nickname",
        regex([/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/]),
        async (state, { matches }) => {
          await enterTopic(state, nicknameTopic, globalTopic, matches[1]);
        }
      ),
      createCondition(
        "calc",
        async (state, message) => {
          const regexpr = /^[0-9\(\)\+\-*/\s]+$/;
          if (message && regexpr.exec(message.text) !== null) {
            try {
              return eval(message.text);
            } catch (e) {
              console.log(e);
            }
          }
        },
        async (state, result) => {
          await enterTopic(state, mathTopic, globalTopic, result);
        }
      ),
      createCondition(
        "wildcard",
        regex([/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/]),
        async (state, { matches }) => {
          await enterTopic(state, wildcardTopic, globalTopic, matches[1]);
        }
      ),
      createCondition(
        "mathexp",
        regex([/^5 \+ 10$/, /^100\/4$/]),
        async (state, { matches }) => {
          await enterTopic(state, mathExpTopic, globalTopic, matches[0]);
        }
      ),
      createCondition(
        "signup",
        regex([/^signup (.*)$/]),
        async (state, { matches }) => {
          await enterTopic(state, signupTopic, globalTopic, matches[1]);
        }
      ),
      createCondition(
        "default",
        async (state, message: IMessage) => {
          return message;
        },
        async (state, message: IMessage) => {
          await enterTopic(state, defaultTopic, globalTopic, message);
        }
      )
    ],
    isRoot: true
  });

  const allTopics = [
    globalTopic,
    mainTopic,
    nicknameTopic,
    mathTopic,
    wildcardTopic,
    mathExpTopic,
    signupTopic,
    validateTopic,
    defaultTopic
  ];

  const topics =
    options && options.includeMain
      ? allTopics
      : allTopics.filter(t => t.name !== "main");

  return {
    env,
    topics
  };
}
