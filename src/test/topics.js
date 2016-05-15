import { defPattern, defHook, enterTopic, exitTopic, exitAllTopics } from "../wild-yak";

export default function getTopics() {
  let env = {}

  const mainTopic = {
    onEntry: async (context, message, extSession) => {
      env._enteredMain = true;
      env._message = message;
      await exitTopic(context);
    }
  }

  const nicknameTopic = {
    onEntry: async (context, name, extSession) => {
      env._enteredNickname = true;
      env._name = name;
    },
    hooks: []
  }

  const mathTopic = {
    onEntry: async (context, result, extSession) => {
      env._enteredMath = true;
      env._result = result;
    }
  }

  const wildcardTopic = {
    onEntry: async (context, message, extSession) => {
      env._enteredWildcard = true;
      env._message = message;
      env._cb(context);
    }
  }

  const mathExpTopic = {
    onEntry: async (context, exp, extSession) => {
      env._enteredMathExp = true;
      env._exp = exp;
    }
  }

  const defaultTopic = {
    onEntry: async (context, message, extSession) => {
      env._enteredDefault = true;
      env._unknownMessage = message;
    }
  }

  const globalTopic = {
    hooks: [
      defPattern(
        "nickname",
        [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
        async (context, {matches}, extSession) => {
          await exitAllTopics(context);
          await enterTopic(context, "nickname", matches[1], extSession)
        }
      ),
      defHook(
        "calc",
        async (context, message) => {
          const regex = /^[0-9\(\)\+\-*/\s]+$/;
          if (regex.exec(message.text) !== null) {
            try {
              return eval(message.text)
            } catch (e) {
              console.log(e)
            }
          }
        },
        async (context, result, extSession) => {
          await exitAllTopics(context);
          await enterTopic(context, "math", result, extSession);
        }
      ),
      defPattern(
        "wildcard",
        [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
        async (context, {matches}, extSession) => {
          await exitAllTopics(context);
          await enterTopic(context, "wildcard", matches[1], extSession);
        }
      ),
      defPattern(
        "mathexp",
        [/^5 \+ 10$/, /^100\/4$/],
        async (context, {matches}, extSession) => {
          await exitAllTopics(context);
          await enterTopic(context, "mathexp", matches[0], extSession);
        }
      ),
      defHook(
        "default",
        async (context, message, extSession) => {
          return message
        },
        async (context, message, extSession) => {
          await enterTopic(context, "default", message, extSession);
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
