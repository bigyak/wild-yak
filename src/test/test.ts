import "mocha";
import "should";
import { init } from "../";

import {
  DefaultTopic,
  IHost,
  IMessage,
  IUserData,
  MathTopic,
  RootTopic
} from "./topics";

const otherTopics = [MathTopic];

function getUserData(): IUserData {
  return {
    session: "666",
    username: "jeswin"
  };
}

function getHost(): IHost {
  return {
    getUserDirectory(username: string) {
      return "/home/jeswin";
    }
  };
}

function getHandler() {
  return init<IMessage, IUserData, IHost>(RootTopic, DefaultTopic, otherTopics);
}

describe("Wild yak", () => {
  it("init() returns a handler", async () => {
    const handler = getHandler();
    handler.should.be.an.instanceOf(Function);
  });

  it("Enters the default topic while starting", async () => {
    const handler = getHandler();

    const message = {
      text: "hello world"
    };

    const output = await handler(message, undefined, getUserData(), getHost());

    output.result.should.equal("greetings comrade!");
  });

  it("If not handled otherwise, should be handled by root topic", async () => {
    const handler = getHandler();

    const message = {
      text: "something something!"
    };

    const output = await handler(message, undefined, getUserData(), getHost());

    output.result.should.equal(
      "Life is like riding a bicycle. To keep your balance you must keep moving."
    );
  });

  it("Enters a new topic from the root topic", async () => {
    const handler = getHandler();

    const message1 = {
      text: "do math"
    };

    const output1 = await handler(
      message1,
      undefined,
      getUserData(),
      getHost()
    );
    output1.result.should.equal("You can type a math expression");

    const message2 = {
      text: "2 + 3"
    };

    const output2 = await handler(
      message2,
      output1.state,
      getUserData(),
      getHost()
    );
    output2.result.should.equal(5);

    const message3 = {
      text: "20 + 30"
    };

    const output3 = await handler(
      message3,
      output1.state,
      getUserData(),
      getHost()
    );
    output3.result.should.equal(50);
  });

  it("Enters a new topic from the root topic", async () => {
    const handler = getHandler();

    const message1 = {
      text: "do math"
    };

    const output1 = await handler(
      message1,
      undefined,
      getUserData(),
      getHost()
    );
    output1.result.should.equal("You can type a math expression");

    const message2 = {
      text: "2 + 3"
    };

    const output2 = await handler(
      message2,
      output1.state,
      getUserData(),
      getHost()
    );
    output2.result.should.equal(5);

    const message3 = {
      text: "20 + 30"
    };

    const output3 = await handler(
      message3,
      output1.state,
      getUserData(),
      getHost()
    );
    output3.result.should.equal(50);
  });

  // it("Returns a message from a pattern", async () => {
  //   const { env, topics } = getTopics({ includeMain: true });
  //   const message = {
  //     text: "Hello world"
  //   };
  //   const handler = await init(topics);
  //   const result = await handler(message);

  //   env._enteredMain.should.be.true();
  //   result.output[0].should.equal("hey, what's up!");
  // });

  // it("Returns a message from a condition", async () => {
  //   const { env, topics } = getTopics({ includeMain: true });
  //   const message = {
  //     text: "Boomshanker"
  //   };
  //   const handler = await init(topics);
  //   const result = await handler(message);

  //   env._enteredMain.should.be.true();
  //   result.output[0].should.equal("omg zomg!");
  // });

  // it("Runs a topic when pattern matches", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "nickname yakyak"
  //   };
  //   const handler = await init(topics);
  //   await handler(message);

  //   env._enteredNickname.should.be.true();
  // });

  // it("Runs a custom condition (non-regex)", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "5 + 10"
  //   };
  //   const handler = await init(topics);
  //   await handler(message);

  //   env._enteredMath.should.be.true();
  // });

  // it("Run the default condition if nothing matches", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "somethingweird"
  //   };
  //   const handler = await init(topics);
  //   await handler(message);

  //   env._enteredDefault.should.be.true();
  // });

  // it("Disables conditions", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "wildcard going to be alone"
  //   };
  //   const handler = await init(topics);
  //   await handler(message);

  //   env._enteredWildcard.should.be.true();
  // });

  // it("Runs a condition for each message", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "wildcard going to be alone"
  //   };
  //   const handler = await init(topics);
  //   env._disabled = ["nickname"];
  //   const result = await handler(message);

  //   env._enteredWildcard.should.be.true();

  //   const message2 = {
  //     text: "nickname yakyak"
  //   };
  //   await handler(message2, result.contexts);

  //   env._enteredDefault.should.be.true();
  // });

  // it("Disables conditions except specified conditions", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "wildcard disableConditionsExcept mathexp"
  //   };
  //   const handler = await init(topics);
  //   env._enabled = ["mathexp"];
  //   const result = await handler(message);

  //   env._enteredWildcard.should.be.true();

  //   const message2 = {
  //     text: "5 + 10"
  //   };
  //   await handler(message2, result.contexts);

  //   env._enteredMathExp.should.be.true();
  // });

  // it("Receives result from sub topic via callback", async () => {
  //   const { env, topics } = getTopics();
  //   const message = {
  //     text: "signup Yak"
  //   };
  //   const handler = await init(topics);
  //   const result1 = await handler(message);
  //   env._enteredSignup.should.be.true();

  //   const message2 = {
  //     text: "name"
  //   };
  //   const result2 = await handler(message2, result1.contexts);
  //   env._enteredValidate.should.be.true();

  //   const message3 = {
  //     text: "name Hemchand"
  //   };
  //   const result3 = await handler(message3, result2.contexts);

  //   env._enteredOnValidateName.should.be.true();
  //   result3.contexts.items.length.should.equal(1);
  // });

  // it("Clears all topics", async () => {
  //   const { env, topics } = getTopics();
  //   env._clearAllTopics = true;
  //   const message1 = {
  //     text: "signup Yak"
  //   };
  //   const handler = await init(topics);
  //   const result1 = await handler(message1);
  //   const message2 = {
  //     text: "name"
  //   };
  //   const result2 = await handler(message2, result1.contexts);
  //   const message3 = {
  //     text: "name Hemchand"
  //   };
  //   const result3 = await handler(message3, result2.contexts);

  //   result3.contexts.items.length.should.equal(0);
  // });

  // it("Throws error on enterTopic() if the provided context isn't on the top of the stack", async () => {
  //   const { env, topics } = getTopics({ includeMain: true });
  //   const message = {
  //     text: "Hello world"
  //   };
  //   const handler = await init(topics);

  //   env.enterTopic_assertTopContextTest = true;

  //   let threwError = false;
  //   try {
  //     await handler(message);
  //   } catch (e) {
  //     threwError = true;
  //     e.message.should.equal(
  //       "You can only enter a new context from the last context."
  //     );
  //   }

  //   threwError.should.be.true();
  // });

  // it("Throws error on exitTopic() if the provided context isn't on the top of the stack", async () => {
  //   const { env, topics } = getTopics({ includeMain: true });
  //   const message = {
  //     text: "Hello world"
  //   };

  //   const handler = await init(topics);

  //   env.exitTopic_assertTopContextTest = true;

  //   let threwError = false;
  //   try {
  //     await handler(message);
  //   } catch (e) {
  //     threwError = true;
  //     e.message.should.equal("You can only exit from the current context.");
  //   }

  //   threwError.should.be.true();
  // });
});
