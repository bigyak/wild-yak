/* @flow */
async function onMainEntry(context) {
  if (context.isFirstTimeUser) {

  }
}

export default async function() {
  return {
    onEntry: onMainEntry
    patterns: [
      defPattern(["hi", "hello"], hi),
    ]
  };
}
