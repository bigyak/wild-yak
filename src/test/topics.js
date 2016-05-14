import { defPattern, defHook, enterTopic, exitTopic, exitAllTopics } from "../wild-yak";

export default function getTopics(opts = {}) {
  opts.main = opts.main || {};
  opts.nickname = opts.nickname || {};

  const mainTopic = {
    onEntry: opts.main.onEntry
  }

  const nicknameTopic = {
    onEntry: opts.nickname.onEntry,
    hooks: opts.nickname.hooks
  }

  const globalTopic = {
    hooks: [
      defPattern(
        "nickname",
        [/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/],
        async (session, matches) => {
          await exitAllTopics(session);
          await enterTopic(session, "nickname", matches[1])
        }
      ),
    ]
  }

  const topics = {
    definitions: {
      "global": globalTopic,
      "main": mainTopic,
      "nickname": nicknameTopic
    }
  };

  return {
    env: {},
    topics
  };
}
