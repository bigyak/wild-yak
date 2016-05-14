import { defPattern, defHook, enterTopic, exitTopic, exitAllTopics } from "../wild-yak";

export default function getTopics(opts = {}) {
  opts.main = opts.main || { onEntry: (context, message) => {} };
  opts.nickname = opts.nickname || {};
  opts.math = opts.math || {};

  const mainTopic = {
    onEntry: opts.main.onEntry
  }

  const nicknameTopic = {
    onEntry: opts.nickname.onEntry,
    hooks: opts.nickname.hooks
  }

  const mathTopic = {
    onEntry: opts.math.onEntry,
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
    ]
  }

  const topics = {
    definitions: {
      "global": globalTopic,
      "main": mainTopic,
      "nickname": nicknameTopic,
      "math": mathTopic
    }
  };

  return {
    env: {},
    topics
  };
}
