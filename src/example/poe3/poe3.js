/* @flow */
import { defTopics, defPattern, defParser, init, enterTopic, exitTopic } from "wild-yak";

import mainTopic from "./topics/main";
import newHaikuTopic from "./topics/new-haiku";
import editHaikuTopic from "./topics/edit-haiku";
import showHaikuTopic from "./topics/show-haiku";
import unsubscribeTopic from "./topics/unsubscribe";
import helpTopic from "./topics/help";

export default function() {
  const topics = defTopics({
    "global": {
      patterns: [
        defPattern(
          ["^new-haiku$", "^new haiku$"],
          async (context, message) => await enterTopic(context, "new-haiku", { message })
        ),
        defPattern(
          ["^private-haiku$", "^private$", "^private haiku$", "^new.?private.?haiku$"],
          async (context, message) => await enterTopic(context, "new-haiku", { access: "private" })
        ),
        defPattern(
          ["^edit (\d*)$"],
          async (context, message, matches) => await enterTopic(context, "edit-haiku", { matches })
        ),
        defPattern(
          ["^show (\d*)$"],
          async (context, message, matches) => await enterTopic(context, "show-haiku", { matches })
        ),
        defPattern(
          ["^follow$", "^follow ([A-z]\w*)"],
          async (context, message, matches) => await enterTopic(context, "follow", { matches })
        ),
        defPattern(
          ["^unfollow$", "^unfollow ([A-z]\w*)"],
          async (context, message, matches) => await enterTopic(context, "unfollow", { matches })
        ),
        defPattern(
          ["^opt-out$", "^opt out$", "^unsubscribe$", "^stop$"],
          async (context, message) => await enterTopic(context, "unsubscribe")
        ),
        defPattern(
          ["^back$", "b", "^cancel$", "c"],
          async (context, message) => await exitTopic(context)
        ),
        defPattern(
          ["^help$", "^help\s+(\w*)$", "^h\s+(\w*)$", "^\?\s+(\w*)$"],
          async (context, message, matches) => await enterTopic(context, "help", { matches })
        )
      ]
    },
    "main": mainTopic(),
    "new-haiku": newHaiku(),
    "edit-haiku": editHaiku(),
    "show-haiku": showHaiku(),
    "unsubscribe": unsubscribe(),
    "help": help()
  });
  return init(topics);
}
