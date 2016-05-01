/* @flow */
import libPoem from "../domain/poem";

async function onEntry(context, args) {
  sendMessage({
    type: 'option',
    text: "What would you like to see?",
    items: [
      "Newest",
      "All time favorites",
      "Random"
    ]
  });
}

async function showNewest(context) {
}

async function showNewest(context) {
}

async function showNewest(context) {
}

export default {
  onEntry,
  parsers: [
    defPattern("newest", showNewest),
    defPattern("all time favorites", showAllTimeFavorites),
    defPattern("random", showRandom)
  ]
}
