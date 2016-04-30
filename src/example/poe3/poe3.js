/* @flow */
import { topics, defPattern, defParser, handleMessage } from "wild-yak";
import mainTopic from "./topics/main";
import newHaikuTopic from "./topics/new-haiku";

export default function() {
  const topics = defTopics({
    "global": {
      patterns: [
        defPattern(["^new.?haiku$"], async () => await switchToTopic("new-haiku")),
        defPattern(["^private$", "^private.?haiku$", "^new.?private.?haiku$"], async () => await switchToTopic("new-haiku", { accessibility: "private" })),
        defPattern(["^edit$"], async () => await switchToTopic("edit-haiku")),
        defPattern(["^opt\.out$", "^unsubscribe$"], async () => await switchToTopic("unsubscribe")),
        defPattern(["^back$", "b"], help, async () => await exitTopic()),
        defPattern(["^help$", "h", "\?"], help, async () => await switchToTopic("help"))
      ]
    },
    "main": mainTopic(),
    "new-haiku": newHaiku(),
    "edit-haiku": editHaiku(),
    "unsubscribe": unsubscribe(),
    "help": help()
  });
  return init(topics);
}
