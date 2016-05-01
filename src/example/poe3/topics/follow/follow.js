/* @flow */
import yak from "wild-yak";
import libUser from "../domain/user";

async function onEntry(context, matches) {
  if (matches.length === 2) {
    const username = matches[1];
    exitTopic(context);
  } else {
    sendMessage(context, {
      type: "option",
      text: `Who do you want to follow?`
      options: [
        "All time greats",
        "Top users",
        "Most active",
        "A specific user"
      ]
    });
  }
}

async function follow(context, matches) {
  const usernames = matches[1];
  await _followImpl(context, usernames);
}

async function _followManyImpl(context) {
  const _usernames = usernames.split(" ");
  if (_usernames.length > 1) {

  } else {
    for (let username of _usernames) {
      const user = await libUser.get(username);
      await libUser.addFollower(username, context.username);
      await libUser.addFollowing(context.username, username);
      sendTextMessage(context, `You're now following ${username}.`);
    }
  }
}

async function _followImpl(context, usernames) {
  const _usernames = usernames.split(" ");
  if (_usernames.length > 1) {

  } else {
    for (let username of _usernames) {
      const user = await libUser.get(username);
      await libUser.addFollower(username, context.username);
      await libUser.addFollowing(context.username, username);
      sendTextMessage(context, `You're now following ${username}.`);
    }
  }
}

export const topic = {
  onEntry,
  parsers: [
    defPattern("^([A-z]\w*)$", (context, _, matches) => await follow(context, matches)),
    defPattern("^(.*)$", (context, _, matches) => await followMany(context, matches))
  ]
}
