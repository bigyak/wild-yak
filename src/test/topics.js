/* @flow */
import { defPattern, defHook, enterTopic, exitTopic } from "../wild-yak";
import type { HookType, StringMessageType, RegexParseResultType, StateType } from "../wild-yak";

export default function getTopics() {
  let env = {}

  const mainTopic = {
    isRoot: true,
    onEntry: async ({context, session}: StateType, message: StringMessageType) => {
      env._enteredMain = true;
      env._message = message;
      await exitTopic({context, session});
      if (env._mainCB) {
        return await env._mainCB({context, session}, message);
      }
    }
  }

  const nicknameTopic = {
    isRoot: true,
    onEntry: async ({context, session}: StateType, name: string) => {
      env._enteredNickname = true;
      env._name = name;
      return "in nickname";
    },
    hooks: ([] : Array<HookType>)
  }

  const mathTopic = {
    isRoot: true,
    onEntry: async ({context, session}: StateType, result: Object) => {
      env._enteredMath = true;
      env._result = result;
      return "in math";
    }
  }

  const wildcardTopic = {
    isRoot: true,
    onEntry: async ({context, session}: StateType, message: StringMessageType) => {
      env._enteredWildcard = true;
      env._message = message;
      env._cb({context, session});
      return "in wildcard";
    }
  }

  const mathExpTopic = {
    isRoot: true,
    onEntry: async ({context, session}: StateType, exp: Object) => {
      env._enteredMathExp = true;
      env._exp = exp;
      return "in mathexp";
    }
  }

  async function onValidateName(_: any, { success, name }: { success: boolean, name: string }) : Promise<string> {
    return `you signed up as ${name}.`;
  }

  const signupTopic = {
    isRoot: true,
    onEntry: async ({context, session}: StateType, message: StringMessageType) => {
      env._enteredSignup = true;
      env._message = message;
    },

    onValidateName,

    hooks: [
      (defPattern(
        "validate",
        [/^name (.*)$/],
        async ({context, session}: StateType, { matches }: RegexParseResultType) => {
          return await enterTopic({context, session}, "validate", matches[1], onValidateName);
        }
      ): Object)
    ],
  }

  const validateTopic = {
    onEntry: async ({context, session}: StateType, name: string) => {
      env._enteredValidate = true;
      env._name = name;
      const result = await exitTopic({context, session}, {success:true, name});
      return result;
    }
  }

  const defaultTopic = {
    onEntry: async ({context, session}: StateType, message: StringMessageType) => {
      env._enteredDefault = true;
      env._unknownMessage = message;
      return "in default";
    }
  }

  const globalTopic = {
    hooks: [
      (defPattern(
        "nickname",
        [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
        async ({context, session}, {matches}) => {
          return await enterTopic({context, session}, "nickname", matches[1])
        }
      ): HookType),
      defHook(
        "calc",
        async ({context, session}: StateType, message) => {
          const regex = /^[0-9\(\)\+\-*/\s]+$/;
          if (regex.exec(message.text) !== null) {
            try {
              return eval(message.text)
            } catch (e) {
              console.log(e)
            }
          }
        },
        async ({context, session}: StateType, result) => {
          return await enterTopic({context, session}, "math", result);
        }
      ),
      defPattern(
        "wildcard",
        [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
        async ({context, session}: StateType, {matches}) => {
          return await enterTopic({context, session}, "wildcard", matches[1]);
        }
      ),
      defPattern(
        "mathexp",
        [/^5 \+ 10$/, /^100\/4$/],
        async ({context, session}: StateType, {matches}) => {
          return await enterTopic({context, session}, "mathexp", matches[0]);
        }
      ),
      defPattern(
        "signup",
        [/^signup (.*)$/, /^100\/4$/],
        async ({context, session}: StateType, {matches}) => {
          await enterTopic({context, session}, "signup", matches[1]);
        }
      ),
      defHook(
        "default",
        async ({context, session}: StateType, message) => {
          return message
        },
        async ({context, session}: StateType, message) => {
          return await enterTopic({context, session}, "default", message);
        }
      ),
    ]
  }

  const topics = {
    definitions: {
      "global": globalTopic,
      "main": mainTopic,
      "nickname": nicknameTopic,
      "math": mathTopic,
      "wildcard": wildcardTopic,
      "mathexp": mathExpTopic,
      "signup": signupTopic,
      "validate": validateTopic,
      "default": defaultTopic
    }
  };

  return {
    env,
    topics
  };
}
