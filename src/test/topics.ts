import {
  clearAllTopics,
  defHook,
  defPattern,
  defTopic,
  disableHooks,
  disableHooksExcept,
  enterTopic,
  exitTopic,
  IApplicationState,
  ITopic,
  UserData
} from "../wild-yak";

export interface IGetTopicsOptions {
  includeMain: boolean;
}

export interface IMessage {
  timestamp?: number;
  text: string;
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

  const mainTopic = defTopic(
    "main",
    async (args: any, userData: UserData) => {
      env._enteredMain = true;
    },
    {
      afterInit: async state => {
        if (
          env.enterTopic_assertTopContextTest ||
          env.exitTopic_assertTopContextTest
        ) {
          env._mainState = state;
          await enterTopic(state, nicknameTopic, mainTopic);
        }
      },
      hooks: [
        defPattern(
          "respond-to-hello",
          [/^Hello (.*)$/],
          async (state, { matches }) => {
            return "hey, what's up!";
          }
        ),
        defHook(
          "boomshanker",
          async (state, message: IMessage) => {
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
    }
  );

  const nicknameTopic = defTopic(
    "nickname",
    async (args, userData) => {
      env._enteredNickname = true;
    },
    {
      afterInit: async () => {
        if (env.enterTopic_assertTopContextTest) {
          await enterTopic(env._mainState, defaultTopic, mathTopic);
        }

        if (env.exitTopic_assertTopContextTest) {
          await exitTopic(env._mainState);
        }
      },
      isRoot: true
    }
  );

  const mathTopic = defTopic(
    "math",
    async (args, userData) => {
      env._enteredMath = true;
    },
    {
      isRoot: true
    }
  );

  const wildcardTopic = defTopic(
    "wildcard",
    async (args, userData) => {
      env._enteredWildcard = true;
    },
    {
      afterInit: async state => {
        if (env._disabled !== undefined) {
          disableHooks(state, env._disabled);
        }
        if (env._enabled !== undefined) {
          disableHooksExcept(state, env._enabled);
        }
      },
      isRoot: true
    }
  );

  const mathExpTopic = defTopic(
    "mathexp",
    async (args, userData) => {
      env._enteredMathExp = true;
    },
    {
      isRoot: true
    }
  );

  async function onValidateName(
    state: IApplicationState<any>,
    args: { success: boolean; name: string }
  ) {
    const { success, name } = args;
    env._enteredOnValidateName = true;
    return `you signed up as ${name}.`;
  }

  const signupTopic = defTopic(
    "signup",
    async (args, userData) => {
      env._enteredSignup = true;
    },
    {
      callbacks: {
        onValidateName
      },
      hooks: [
        defPattern("validate", [/^name$/], async (state, { matches }) => {
          await enterTopic(
            state,
            validateTopic,
            signupTopic,
            undefined,
            onValidateName
          );
        })
      ],
      isRoot: true
    }
  );

  const validateTopic = defTopic(
    "validate",
    async (args, userData) => {
      env._enteredValidate = true;
    },
    {
      hooks: [
        defPattern("validate", [/^name (.*)$/], async (state, { matches }) => {
          if (!env._clearAllTopics) {
            await exitTopic(state, { success: true });
          } else {
            await clearAllTopics(state);
          }
        })
      ]
    }
  );

  const defaultTopic = defTopic(
    "default",
    async (args, userData) => {
      env._enteredDefault = true;
    },
    {
      isRoot: false
    }
  );

  const globalTopic = defTopic(
    "global",
    async (args, userData: UserData) => undefined,
    {
      hooks: [
        defPattern(
          "nickname",
          [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
          async (state, { matches }) => {
            await enterTopic(state, nicknameTopic, globalTopic, matches[1]);
          }
        ),
        defHook(
          "calc",
          async (state, message: IMessage) => {
            const regex = /^[0-9\(\)\+\-*/\s]+$/;
            if (message && regex.exec(message.text) !== null) {
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
        defPattern(
          "wildcard",
          [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
          async (state, { matches }) => {
            await enterTopic(state, wildcardTopic, globalTopic, matches[1]);
          }
        ),
        defPattern(
          "mathexp",
          [/^5 \+ 10$/, /^100\/4$/],
          async (state, { matches }) => {
            await enterTopic(state, mathExpTopic, globalTopic, matches[0]);
          }
        ),
        defPattern("signup", [/^signup (.*)$/], async (state, { matches }) => {
          await enterTopic(state, signupTopic, globalTopic, matches[1]);
        }),
        defHook(
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
    }
  );

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
