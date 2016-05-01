/* @flow */
async function onMainEntry(context) {
  if (context.isFirstTimeUser) {

  } else {

  }
}

export const topic = {
  onEntry: onMainEntry
  parsers: [
    defPattern(["hi", "hello"], hi),
  ]
}
