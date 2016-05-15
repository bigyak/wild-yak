import { defPattern, defHook, enterTopic, exitTopic, exitAllTopics } from "../wild-yak";

export default function getTopics() {
  let env = {}

  const mainTopic = {
    onEntry: async (context, message) => {
      env._enteredMain = true;
      env._message = message;
      await exitTopic(context);
    }
  }

  const nicknameTopic = {
    onEntry: async (context, name) => {
      env._enteredNickname = true;
      env._name = name;
    },
    hooks: []
  }

  const mathTopic = {
    onEntry: async (context, result) => {
      env._enteredMath = true;
      env._result = result;
    }
  }

  const wildcardTopic = {
    onEntry: async (context, message) => {
      env._enteredWildcard = true;
      env._message = message;
      env._cb(context);
    }
  }

  const mathExpTopic = {
    onEntry: async (context, exp) => {
      env._enteredMathExp = true;
      env._exp = exp;
    }
  }

  const defaultTopic = {
    onEntry: async (context, message) => {
      env._enteredDefault = true;
      env._unknownMessage = message;
    }
  }

  const globalTopic = {
    hooks: [
      defPattern(
        "nickname",
        [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
        async (session, {matches}) => {
          await exitAllTopics(session);
          await enterTopic(session, "nickname", matches[1])
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
        async (session, result) => {
          await exitAllTopics(session);
          await enterTopic(session, "math", result);
        }
      ),
      defPattern(
        "wildcard",
        [/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/],
        async (session, {matches}) => {
          await exitAllTopics(session);
          await enterTopic(session, "wildcard", matches[1]);
        }
      ),
      defPattern(
        "mathexp",
        [/^5 \+ 10$/, /^100\/4$/],
        async (session, {matches}) => {
          await exitAllTopics(session);
          await enterTopic(session, "mathexp", matches[0]);
        }
      ),
      defHook(
        "default",
        async (context, message) => {
          return message
        },
        async (session, message) => {
          await enterTopic(session, "default", message);
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
