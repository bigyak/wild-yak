/* @flow */
import { defTopics, defPattern, defParser, init, switchToTopic, exitTopic } from "wild-yak";

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
        defPattern(["^new.?haiku$"], async () => await switchToTopic("new-haiku")),
        defPattern(["^private$", "^private.?haiku$", "^new.?private.?haiku$"], async () => await switchToTopic("new-haiku", { accessibility: "private" })),
        defPattern(["^edit$"], async () => await switchToTopic("edit-haiku")),
        defPattern(["^show$"], async () => await switchToTopic("show-haiku")),
        defPattern(["^opt\.out$", "^unsubscribe$"], async () => await switchToTopic("unsubscribe")),
        defPattern(["^back$", "b"], help, async () => await exitTopic(context)),
        defPattern(["^help$", "h", "\?"], help, async () => await switchToTopic("help"))
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
