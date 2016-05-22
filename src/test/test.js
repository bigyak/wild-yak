import __polyfill from "babel-polyfill";
import should from "should";
import { init, enterTopic, exitTopic, disableHooks, disableHooksExcept } from "../wild-yak";
import getTopics from "./topics";
import * as libSession from "../lib/session";

describe("Wild yak", () => {

  function getSession() {
    return {
      id: Math.random().toString(36).substring(16),
      type: "web",
      user: { id: "iron_maiden", name: "Iron Maiden", firstName: "Iron", lastName: "Maiden" }
    }
  }

  function getSessionId(session) { return session.id; }
  function getSessionType(session) { return session.type; }

  it("init() returns a handler", async () => {
    const { env, topics } = getTopics();
    const handler = await init(topics, {getSessionId, getSessionType});
    handler.should.be.an.instanceOf(Function);
  });

  it("Enters main::init(session, message) while starting", async () => {
    const session = getSession();
    const { env, topics } = getTopics({ includeMain: true });

    const message = { text: "Hello world" };

    const handler = await init(topics, {getSessionId, getSessionType});
    await handler(session, message);

    env._enteredMain.should.be.true("Entered main");
  });


  it("Runs a hook when pattern matches", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "nickname yakyak" };

    const handler = await init(topics, {getSessionId, getSessionType});
    await handler(session, message);

    env._enteredNickname.should.be.true("Entered nickname");
  });


  it("Runs a custom hook (non-regex)", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "5 + 10" };

    const handler = await init(topics, { getSessionId, getSessionType });
    await handler(session, message);

    env._enteredMath.should.be.true("Entered math");
  });


  it("Run the default hook if nothing matches", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "somethingweird" };

    const handler = await init(topics, {getSessionId, getSessionType});
    await handler(session, message);

    env._enteredDefault.should.be.true("Entered default");
  });


  it("Disables hooks", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "wildcard going to be alone" };
    const message2 = { text: "nickname yakyak" };

    const handler = await init(topics, {getSessionId, getSessionType});

    await handler(session, message);
    env._enteredWildcard.should.be.true("Entered wildcard");
  });


  it("Runs a hook for each message", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "wildcard going to be alone" };
    const message2 = { text: "nickname yakyak" };

    const handler = await init(topics, {getSessionId, getSessionType});

    env._disabled = ["nickname"];
    await handler(session, message);
    env._enteredWildcard.should.be.true("Entered wildcard");

    await handler(session, message2);
    env._enteredDefault.should.be.true("Entered default");
  });


  it("Disables hooks except specified hooks", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "wildcard disableHooksExcept mathexp" };
    const message2 = { text: "5 + 10" };

    const handler = await init(topics, {getSessionId, getSessionType});

    env._enabled = ["mathexp"];
    await handler(session, message);
    env._enteredWildcard.should.be.true("Entered wildcard");

    await handler(session, message2);
    env._enteredMathExp.should.be.true("Entered mathexp");
  });


  it("Receive result from sub topic via callback", async () => {
    const session = getSession();
    const { env, topics } = getTopics();

    const message = { text: "signup Yak" };
    const message2 = { text: "name Hemchand" };

    const handler = await init(topics, {getSessionId, getSessionType});
    await handler(session, message);
    env._enteredSignup.should.be.true("Entered signup");

    await handler(session, message2);
    env._enteredValidate.should.be.true("Entered signup");
    env._enteredOnValidateName.should.be.true();
  });


  it("Throws error on enterTopic() if the provided context isn't on the top of the stack", async () => {
    const session = getSession();
    const { env, topics } = getTopics({ includeMain: true });

    const message = { text: "Hello world" };

    const handler = await init(topics, { getSessionId, getSessionType });

    env.enterTopic_assertTopContextTest = true;
    let _threwError = false;
    try {
      await handler(session, message);
    } catch(e) {
      _threwError = true;
      e.message.should.equal("You can only enter a new context from the last context.");
    }
    _threwError.should.be.true();
  });


  it("Throws error on exitTopic() if the provided context isn't on the top of the stack", async () => {
    const session = getSession();
    const { env, topics } = getTopics({ includeMain: true });

    const message = { text: "Hello world" };

    const handler = await init(topics, { getSessionId, getSessionType });

    env.exitTopic_assertTopContextTest = true;
    let _threwError = false;
    try {
      await handler(session, message);
    } catch(e) {
      _threwError = true;
      e.message.should.equal("You can only exit from the current context.");
    }
    _threwError.should.be.true();
  });

})
