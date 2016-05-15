import { defPattern, defHook, enterTopic, exitTopic, exitAllTopics } from "../wild-yak";

export default function getTopics() {
  let env = {}

  const mainTopic = {
    onEntry: async ({context, extSession}, message) => {
      env._enteredMain = true;
      env._message = message;
      await exitTopic({context, extSession});
    }
  }

  const nicknameTopic = {
    onEntry: async ({context, extSession}, name) => {
      env._enteredNickname = true;
      env._name = name;
    },
    hooks: []
  }

  const mathTopic = {
    onEntry: async ({context, extSession}, result) => {
      env._enteredMath = true;
      env._result = result;
    }
  }

  const wildcardTopic = {
    onEntry: async ({context, extSession}, message) => {
      env._enteredWildcard = true;
      env._message = message;
      env._cb({context, extSession});
    }
  }

  const mathExpTopic = {
    onEntry: async ({context, extSession}, exp) => {
      env._enteredMathExp = true;
      env._exp = exp;
    }
  }

  const defaultTopic = {
    onEntry: async ({context, extSession}, message) => {
      env._enteredDefault = true;
      env._unknownMessage = message;
    }
  }

  const globalTopic = {
    hooks: [
      defPattern(
        "nickname",
        [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
        async ({context, extSession}, {matches}) => {
          await exitAllTopics({context, extSession});
          await enterTopic({context, extSession}, "nickname", matches[1])
        }
      ),
      defHook(
        "calc",
        async ({context, extSession}, message) => {
          const regex = /^[0-9\(\)\+\-*/\s]+$/;
          if (regex.exec(message.text) !== null) {
            try {
              return eval(message.text)
            } catch (e) {
              console.log(e)
            }
          }
        },
        async ({context, extSession}, result) => {
          await exitAllTopics({context, extSession});
          await enterTopic({context, extSession}, "math", result);
        }
      ),
      defPattern(
        "wildcard",
        [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
        async ({context, extSession}, {matches}) => {
          await exitAllTopics({context, extSession});
          await enterTopic({context, extSession}, "wildcard", matches[1]);
        }
      ),
      defPattern(
        "mathexp",
        [/^5 \+ 10$/, /^100\/4$/],
        async ({context, extSession}, {matches}) => {
          await exitAllTopics({context, extSession});
          await enterTopic({context, extSession}, "mathexp", matches[0]);
        }
      ),
      defHook(
        "default",
        async ({context, extSession}, message) => {
          return message
        },
        async ({context, extSession}, message) => {
          await enterTopic({context, extSession}, "default", message);
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
      "default": defaultTopic
    }
  };

  return {
    env,
    topics
  };
}
