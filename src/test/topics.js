import { defTopic, defPattern, defHook, enterTopic, exitTopic, clearAllTopics, disableHooks, disableHooksExcept } from "../wild-yak";

export default function getTopics(options) {

  let env = {
    _enteredMain: false,
    _enteredNickname: false,
    _enteredMath: false,
    _enteredWildcard: false,
    _enteredMathExp: false,
    _enteredSignup: false,
    _enteredValidate: false,
    _enteredOnValidateName: false,
    _enteredDefault: false
  }

  const mainTopic = defTopic(
    "main",
    async (args, userData) => {
      env._enteredMain = true;
    },
    {
      isRoot: true,
      afterInit: async (state) => {
        if (env.enterTopic_assertTopContextTest || env.exitTopic_assertTopContextTest) {
          env._mainState = state;
          await enterTopic(state, nicknameTopic, mainTopic)
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
          async (state, message) => {
            if (message.text === "Boomshanker") {
              return "zomg!"
            }
          },
          async (state, zomg) => {
            return `omg ${zomg}`;
          }
        )
      ]
    }
  );

  const nicknameTopic = defTopic(
    "nickname",
    async (args, userData) => {
      env._enteredNickname = true;
    },
    {
      isRoot: true,
      afterInit: async () => {
        if (env.enterTopic_assertTopContextTest) {
          await enterTopic(env._mainState, defaultTopic, mathTopic);
        }

        if (env.exitTopic_assertTopContextTest) {
          await exitTopic(env._mainState);
        }
      }
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
      isRoot: true,
      afterInit: async (state) => {
        if (env._disabled !== undefined) {
          disableHooks(state, env._disabled);
        }
        if (env._enabled !== undefined) {
          disableHooksExcept(state, env._enabled);
        }
      }
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


  async function onValidateName(state, args) {
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
      isRoot: true,
      callbacks: {
        onValidateName
      },
      hooks: [
        defPattern(
          "validate",
          [/^name$/],
          async (state, { matches }) => {
            await enterTopic(
              state,
              validateTopic,
              signupTopic,
              undefined,
              onValidateName
            );
          }
        )
      ]
    }
  );

  const validateTopic = defTopic(
    "validate",
    async (args, userData) => {
      env._enteredValidate = true;
    },
    {
      hooks: [
        defPattern(
          "validate",
          [/^name (.*)$/],
          async (state, { matches }) => {
            if (!env._clearAllTopics) {
              await exitTopic(state, { success: true });
            } else {
              await clearAllTopics(state);
            }
          }
        )
      ]
    }
  );

  const defaultTopic = defTopic(
    "default",
    async (args, userData) => {
      env._enteredDefault = true;
    },
    {
      isRoot: false,
    }
  );

  const globalTopic = defTopic(
    "global",
    async (args, userData) => {},
    {
      isRoot: true,
      hooks: [
        defPattern(
          "nickname",
          [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
          async (state, { matches }) => {
            await enterTopic(state, nicknameTopic, globalTopic, matches[1])
          }
        ),
        defHook(
          "calc",
          async (state, message) => {
            const regex = /^[0-9\(\)\+\-*/\s]+$/;
            if (regex.exec(message.text) !== null) {
              try {
                return eval(message.text)
              } catch (e) {
                console.log(e)
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
        defPattern(
          "signup",
          [/^signup (.*)$/],
          async (state, { matches }) => {
            await enterTopic(state, signupTopic, globalTopic, matches[1]);
          }
        ),
        defHook(
          "default",
          async (state, message) => {
            return message
          },
          async (state, message) => {
            await enterTopic(state, defaultTopic, globalTopic, message);
          }
        ),
      ]
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

  const topics = (options && options.includeMain) ? allTopics : allTopics.filter(t => t.name !== "main");

  return {
    env,
    topics
  };
}
