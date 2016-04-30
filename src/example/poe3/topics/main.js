/* @flow */
async function onMainEntry(context) {
  resetNesting();
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
