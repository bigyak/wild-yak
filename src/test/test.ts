import "mocha";
import "should";
import {
  disableConditions,
  disableConditionsExcept,
  enterTopic,
  exitTopic,
  init
} from "../wild-yak";
import getTopics from "./topics";
import { IMessage } from "./topics";

describe("Wild yak", () => {
  function getSession() {
    return {
      id: Math.random()
        .toString(36)
        .substring(16),
      type: "web",
      user: {
        firstName: "Iron",
        id: "iron_maiden",
        lastName: "Maiden",
        name: "Iron Maiden"
      }
    };
  }

  it("init() returns a handler", async () => {
    const { env, topics } = getTopics();
    const handler = await init(topics);
    handler.should.be.an.instanceOf(Function);
  });

  it("Enters topic main while starting", async () => {
    const { env, topics } = getTopics({ includeMain: true });
    const message = {
      text: "Hello world"
    };
    const handler = await init(topics);
    await handler(message);

    env._enteredMain.should.be.true();
  });

  it("Returns a message from a pattern", async () => {
    const { env, topics } = getTopics({ includeMain: true });
    const message = {
      text: "Hello world"
    };
    const handler = await init(topics);
    const result = await handler(message);

    env._enteredMain.should.be.true();
    result.output[0].should.equal("hey, what's up!");
  });

  it("Returns a message from a condition", async () => {
    const { env, topics } = getTopics({ includeMain: true });
    const message = {
      text: "Boomshanker"
    };
    const handler = await init(topics);
    const result = await handler(message);

    env._enteredMain.should.be.true();
    result.output[0].should.equal("omg zomg!");
  });

  it("Runs a topic when pattern matches", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "nickname yakyak"
    };
    const handler = await init(topics);
    await handler(message);

    env._enteredNickname.should.be.true();
  });

  it("Runs a custom condition (non-regex)", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "5 + 10"
    };
    const handler = await init(topics);
    await handler(message);

    env._enteredMath.should.be.true();
  });

  it("Run the default condition if nothing matches", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "somethingweird"
    };
    const handler = await init(topics);
    await handler(message);

    env._enteredDefault.should.be.true();
  });

  it("Disables conditions", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "wildcard going to be alone"
    };
    const handler = await init(topics);
    await handler(message);

    env._enteredWildcard.should.be.true();
  });

  it("Runs a condition for each message", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "wildcard going to be alone"
    };
    const handler = await init(topics);
    env._disabled = ["nickname"];
    const result = await handler(message);

    env._enteredWildcard.should.be.true();
    
    const message2 = {
      text: "nickname yakyak"
    };
    await handler(message2, result.contexts);
    
    env._enteredDefault.should.be.true();
  });

  it("Disables conditions except specified conditions", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "wildcard disableConditionsExcept mathexp"
    };
    const handler = await init(topics);
    env._enabled = ["mathexp"];
    const result = await handler(message);

    env._enteredWildcard.should.be.true();

    const message2 = {
      text: "5 + 10"
    };
    await handler(message2, result.contexts);

    env._enteredMathExp.should.be.true();
  });

  it("Receives result from sub topic via callback", async () => {
    const { env, topics } = getTopics();
    const message = {
      text: "signup Yak"
    };
    const handler = await init(topics);
    const result1 = await handler(message);
    env._enteredSignup.should.be.true();

    const message2 = {
      text: "name"
    };
    const result2 = await handler(message2, result1.contexts);
    env._enteredValidate.should.be.true();

    const message3 = {
      text: "name Hemchand"
    };
    const result3 = await handler(message3, result2.contexts);

    env._enteredOnValidateName.should.be.true();
    result3.contexts.items.length.should.equal(1);
  });

  it("Clears all topics", async () => {
    const { env, topics } = getTopics();
    env._clearAllTopics = true;
    const message1 = {
      text: "signup Yak"
    };
    const handler = await init(topics);
    const result1 = await handler(message1);
    const message2 = {
      text: "name"
    };
    const result2 = await handler(message2, result1.contexts);
    const message3 = {
      text: "name Hemchand"
    };
    const result3 = await handler(message3, result2.contexts);

    result3.contexts.items.length.should.equal(0);
  });

  it("Throws error on enterTopic() if the provided context isn't on the top of the stack", async () => {
    const { env, topics } = getTopics({ includeMain: true });
    const message = {
      text: "Hello world"
    };
    const handler = await init(topics);

    env.enterTopic_assertTopContextTest = true;

    let threwError = false;
    try {
      await handler(message);
    } catch (e) {
      threwError = true;
      e.message.should.equal(
        "You can only enter a new context from the last context."
      );
    }

    threwError.should.be.true();
  });

  it("Throws error on exitTopic() if the provided context isn't on the top of the stack", async () => {
    const { env, topics } = getTopics({ includeMain: true });
    const message = {
      text: "Hello world"
    };

    const handler = await init(topics);

    env.exitTopic_assertTopContextTest = true;

    let threwError = false;
    try {
      await handler(message);
    } catch (e) {
      threwError = true;
      e.message.should.equal("You can only exit from the current context.");
    }

    threwError.should.be.true();
  });
});
