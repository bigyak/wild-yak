import { defPattern, defHook, enterTopic, exitTopic } from "../wild-yak";
import type { TopicType, HookType, StringMessageType, RegexParseResultType, StateType } from "../types";

export default function getTopics() {
  let env = {}

  const mainTopic = {
    name: "main",
    isRoot: true,
    init: async (state: StateType, message: StringMessageType) => {
      env._enteredMain = true;
      env._message = message;
      await exitTopic(state);
      if (env._mainCB) {
        await env._mainCB(state, message);
      }
    }
  }

  const nicknameTopic = {
    name: "nickname",
    isRoot: true,
    init: async (state: StateType, name: string) => {
      env._enteredNickname = true;
      env._name = name;
    }
  }

  const mathTopic: TopicType<Object, string> = {
    name: "math",
    isRoot: true,
    init: async (state: StateType, result: Object) => {
      env._enteredMath = true;
      env._result = result;
    }
  }

  const wildcardTopic = {
    name: "wildcard",
    isRoot: true,
    init: async (state: StateType, message: string) => {
      env._enteredWildcard = true;
      env._message = message;
      env._cb(state);
    }
  }

  const mathExpTopic = {
    name: "mathexp",
    isRoot: true,
    init: async (state: StateType, exp: string) => {
      env._enteredMathExp = true;
      env._exp = exp;
    }
  }

  async function onValidateName(state: StateType, args: { success: boolean, name: string }) : Promise<string> {
    const { success, name } = args;
    return `you signed up as ${name}.`;
  }

  const signupTopic: TopicType<string> = {
    name: "signup",
    isRoot: true,
    init: async (state: StateType, message: StringMessageType) => {
      env._enteredSignup = true;
      env._message = message;
    },

    onValidateName,

    hooks: [
      defPattern(
        "validate",
        [/^name (.*)$/],
        async (state: StateType, { matches }: RegexParseResultType) => {
          await enterTopic(
            state,
            validateTopic,
            matches[1]
          );
        }
      )
    ]
  }

  const validateTopic: TopicType<string, { success: boolean, name: string }> = {
    name: "validate",
    init: async (state: StateType, name: string) => {
      env._enteredValidate = true;
      env._name = name;
      await exitTopic(state, { success: true, name });
    }
  }

  const defaultTopic: TopicType<StringMessageType, string> = {
    name: "default",
    init: async (state: StateType, message: StringMessageType) => {
      env._enteredDefault = true;
      env._unknownMessage = message;
    }
  }

  const globalTopic: TopicType<void, void> = {
    name: "global",
    hooks: [
      defPattern(
        "nickname",
        [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
        async (state, {matches}) => {
          await enterTopic(state, nicknameTopic, matches[1])
        }
      ),
      defHook(
        "calc",
        async (state: StateType, message) => {
          const regex = /^[0-9\(\)\+\-*/\s]+$/;
          if (regex.exec(message.text) !== null) {
            try {
              return eval(message.text)
            } catch (e) {
              console.log(e)
            }
          }
        },
        async (state: StateType, result) => {
          await enterTopic(state, mathTopic, result);
        }
      ),
      defPattern(
        "wildcard",
        [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
        async (state: StateType, {matches}) => {
          await enterTopic(state, wildcardTopic, matches[1]);
        }
      ),
      defPattern(
        "mathexp",
        [/^5 \+ 10$/, /^100\/4$/],
        async (state: StateType, {matches}) => {
          await enterTopic(state, mathExpTopic, matches[0]);
        }
      ),
      defPattern(
        "signup",
        [/^signup (.*)$/, /^100\/4$/],
        async (state: StateType, {matches}) => {
          await enterTopic(state, signupTopic, matches[1]);
        }
      ),
      defHook(
        "default",
        async (state: StateType, message) => {
          return message
        },
        async (state: StateType, message) => {
          await enterTopic(state, defaultTopic, message);
        }
      ),
    ]
  }

  const topics = [
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

  return {
    env,
    topics
  };
}
