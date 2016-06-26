import { defTopic, defPattern, defHook, enterTopic, exitTopic, disableHooks, disableHooksExcept, clearConversation } from "../wild-yak";
import type { TopicType, HookType, RegexParseResultType, StateType } from "../types";

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
    async (args, session) => {
      env._enteredMain = true;
    },
    {
      isRoot: true,
      afterInit: async (state) => {
        if (env.enterTopic_assertTopContextTest || env.exitTopic_assertTopContextTest) {
          env._mainState = state;
          await enterTopic(mainTopic, state, nicknameTopic)
        }
        if (env.clearConversation_test) {
          await clearConversation(state);
        }
      },
      hooks: [
        defPattern(
          mainTopic,
          "respond-to-hello",
          [/^Hello (.*)$/],
          async (state, { matches }) => {
            return "hey, what's up!";
          }
        ),
        defHook(
          mainTopic,
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
    async (args, session) => {
      env._enteredNickname = true;
    },
    {
      isRoot: true,
      afterInit: async () => {
        if (env.enterTopic_assertTopContextTest) {
          await enterTopic(mathTopic, env._mainState, defaultTopic);
        }

        if (env.exitTopic_assertTopContextTest) {
          await exitTopic(mathTopic, env._mainState);
        }
      }
    }
  );

  const mathTopic = defTopic(
    "math",
    async (args, session) => {
      env._enteredMath = true;
    },
    {
      isRoot: true
    }
  );


  const wildcardTopic = defTopic(
    "wildcard",
    async (args, session) => {
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
    async (args, session) => {
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
    async (args, session) => {
      env._enteredSignup = true;
    },
    {
      isRoot: true,
      callbacks: {
        onValidateName
      },
      hooks: [
        defPattern(
          signupTopic,
          "validate",
          [/^name$/],
          async (state, { matches }) => {
            await enterTopic(
              signupTopic,
              state,
              validateTopic,
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
    async (args, session) => {
      env._enteredValidate = true;
    },
    {
      hooks: [
        defPattern(
          signupTopic,
          "validate",
          [/^name (.*)$/],
          async (state, { matches }) => {
            await exitTopic(validateTopic, state, { success: true });
          }
        )
      ]
    }
  );

  const defaultTopic = defTopic(
    "default",
    async (args, session) => {
      env._enteredDefault = true;
    },
    {
      isRoot: false,
    }
  );

  const globalTopic = defTopic(
    "global",
    async (args, session) => {},
    {
      isRoot: true,
      hooks: [
        defPattern(
          globalTopic,
          "nickname",
          [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
          async (state, { matches }) => {
            await enterTopic(globalTopic, state, nicknameTopic, matches[1])
          }
        ),
        defHook(
          globalTopic,
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
            await enterTopic(globalTopic, state, mathTopic, result);
          }
        ),
        defPattern(
          globalTopic,
          "wildcard",
          [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
          async (state, { matches }) => {
            await enterTopic(globalTopic, state, wildcardTopic, matches[1]);
          }
        ),
        defPattern(
          globalTopic,
          "mathexp",
          [/^5 \+ 10$/, /^100\/4$/],
          async (state, { matches }) => {
            await enterTopic(globalTopic, state, mathExpTopic, matches[0]);
          }
        ),
        defPattern(
          globalTopic,
          "signup",
          [/^signup (.*)$/, /^100\/4$/],
          async (state, { matches }) => {
            await enterTopic(globalTopic, state, signupTopic, matches[1]);
          }
        ),
        defHook(
          globalTopic,
          "default",
          async (state, message) => {
            return message
          },
          async (state, message) => {
            await enterTopic(globalTopic, state, defaultTopic, message);
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
    topics: {
      maintopics: topics,
      other: []
    }
  };
}
