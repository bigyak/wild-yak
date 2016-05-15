import __polyfill from "babel-polyfill";
import should from "should";
import { init, disableHooks, disableHooksExcept } from "../wild-yak";
import getTopics from "./topics";

describe("Wild yak", () => {
  const sessionData = {
    sessionId: "666",
    sessionType: "web",
    user: { id: "iron_maiden", name: "Iron Maiden", firstName: "Iron", lastName: "Maiden" }
  }


  it("init() returns a handler", async () => {
    const { env, topics } = getTopics();
    const handler = await init(topics);
    handler.should.be.an.instanceOf(Function);
  });

  it("Enters main::onEntry(session, message) while starting", async () => {
    const { env, topics } = getTopics();

    const message = { text: "Hello world" };
    const session = { id: "0943233" }

    const handler = await init(topics);

    await handler(sessionData, message);
    env._enteredMain.should.be.true();
    env._message.should.equal(message);
  });


  it("Runs a hook when pattern matches", async () => {
    const { env, topics } = getTopics();

    const message = { text: "nickname yakyak" };
    const session = { id: "0943234" }

    const handler = await init(topics);

    await handler(sessionData, message);
    env._enteredNickname.should.be.true();
    env._name.should.equal("yakyak");
  });


  it("Runs a hook when you write a mathematical calculation", async () => {
    const { env, topics } = getTopics();

    const message = { text: "5 + 10" };
    const session = { id: "0943235" }

    const handler = await init(topics);

    await handler(sessionData, message);
    env._enteredMath.should.be.true();
    env._result.should.equal(5 + 10);
  });


  it("Run the default on not matching any hook", async () => {
    const { env, topics } = getTopics();

    const message = { text: "somethingweird" };
    const session = { id: "0943236" }

    const handler = await init(topics);

    await handler(sessionData, message);
    env._enteredDefault.should.be.true();
    env._unknownMessage.should.equal(message);
  });


  it("Run default topic on disabling nickname hook", async () => {
    const { env, topics } = getTopics();

    const message = { text: "wildcard going to be alone" };
    const message2 = { text: "nickname yakyak" };

    const handler = await init(topics);
    env._cb = (context) => {
      disableHooks(context, ["nickname"]);
    }
    await handler(sessionData, message);
    env._enteredWildcard.should.be.true();
    env._message.should.equal("going to be alone");

    await handler(sessionData, message2);
    env._enteredDefault.should.be.true();
    env._unknownMessage.should.equal(message2);
  });


  it("Run mathexp topic on disableHooksExcept mathexp", async () => {
    const { env, topics } = getTopics();

    const message = { text: "wildcard disableHooksExcept mathexp" };
    const message2 = { text: "5 + 10" };

    const handler = await init(topics);
    env._cb = (context) => {
      disableHooksExcept(context, ["mathexp"]);
    }
    await handler(sessionData, message);
    env._enteredWildcard.should.be.true();
    env._message.should.equal("disableHooksExcept mathexp");
    env._cb = (context) => {
      disableHooksExcept(context, ["mathexp"]);
    }

    await handler(sessionData, message2);
    env._enteredMathExp.should.be.true();
    env._exp.should.equal(message2.text);
  });

})
