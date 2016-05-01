/* @flow */
import { defTopics, defPattern, defParser, init, enterTopic, exitTopic } from "wild-yak";

import main from "./topics/main";
import newHaiku from "./topics/new-haiku";
import editHaiku from "./topics/edit-haiku";
import parseHaiku from "./topics/edit-haiku";
import showHaiku from "./topics/show-haiku";
import showHaikuById from "./topics/show-haiku-by-id";
import showHaikuByUsername from "./topics/show-haiku-by-username";
import unsubscribe from "./topics/unsubscribe";
import help from "./topics/help";

import libPoem from "./domain/poem";

const topics = defTopics({
  "global": {
    parsers: [
      /*
        You can write a haiku from any context.
        Wherever three lines are encountered, that's considered a new haiku.
        If in case this needs to be disabled in a context, use disableParser(context, "haiku")
      */
      defParser(
        "haiku",
        async (context, message) => {
          const validation = await parseHaiku.parser(context, message);
          return {
            matched: validation.isValid,
            text: message.text
          }
        },
        async (context, args) => {
          await libPoem.save({ type: "haiku", userid: context.userid, username: context.username, text: args.text });
        }
      ),
      defPattern(
        "edit",
        ["^edit$"],
        async (context) => {
          await exitAllTopics(context);
          await enterTopic(context, "edit-haiku", { matches })
        }
      ),
      defPattern(
        "edit-haiku-by-id",
        ["^edit (\d+)$"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "edit-haiku-by-id", { matches[1] })
        }
      ),
      defPattern(
        "show",
        ["^show$"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "show-haiku", { matches });
        }
      ),
      defPattern(
        "show-haiku-by-username",
        ["^show ([A-z]\w*)$"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "show-haiku-by-username", matches[1]);
        }
      ),
      defPattern(
        "show-haiku-by-id",
        ["^show (\d*)$"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "show-haiku-by-id", { matches });
        }
      ),
      defPattern(
        "follow",
        ["^follow$", "^follow ([A-z]\w*)"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "follow", { matches });
        }
      ),
      defPattern(
        "unfollow",
        ["^unfollow$", "^unfollow ([A-z]\w*)"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "unfollow", { matches });
        }
      ),
      defPattern(
        "my-haiku",
        ["^my-haiku$", "(show|see|list|display|find|view) my haikus?$"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "my-haiku");
        }
      ),
      defPattern(
        "message",
        ["^message$"],
        async (context) => {
          await enterTopic(context, "message");
        }
      ),
      defPattern(
        "message-username",
        ["^message ([A-z]\w*)$"],
        async (context, message, matches) => {
          await enterTopic(context, "message-username", { username: matches[1] });
        }
      ),
      defPattern(
        "message-username-inline",
        ["^message ([A-z]\w*)(\s?(.*))$"],
        async (context, message, matches) => {
          await enterTopic(context, "message-username-inline", { username: matches[1], message: matches[3] });
        }
      ),
      defPattern(
        "my-account",
        ["^my-account$", "^my account$"],
        async (context, message, matches) => {
          await exitAllTopics(context);
          await enterTopic(context, "my-account");
        }
      ),
      defPattern(
        "opt-out",
        ["^opt-out$", "^opt out$", "^unsubscribe$", "^stop$"],
        async (context, message) => {
          await exitAllTopics(context);
          await enterTopic(context, "unsubscribe");
        }
      ),
      defPattern(
        "back",
        ["^back$", "^b$", "^cancel$", "^c$", "^\.\.$"],
        async (context, message) => {
          await exitTopic(context);
        }
      ),
      defPattern(
        "help",
        ["^help$", "^help\s+(\w*)$", "^h\s+(\w*)$", "^\?\s+(\w*)$"],
        async (context, message, matches) => await enterTopic(context, "help", { matches })
      ),
      defPattern(
        "help-exact",
        ["^help$"],
        async (context, message) => await enterTopic(context, "help")
      ),
      defPattern(
        "tip",
        ["^tip$"],
        async (context, message) => await enterTopic(context, "tip")
      )
    ]
  },
  "main": main.topic,
  "new-haiku": newHaiku.topic,
  "edit-haiku": editHaiku.topic,
  "show-haiku": showHaiku.topic,
  "unsubscribe": unsubscribe.topic,
  "help": help.topic
});

export default init(topics);
