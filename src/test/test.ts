import "mocha";
import "should";
import { IEvalState, init, ISerializableEvalState } from "../";

import {
  AdvancedMathTopic,
  DefaultTopic,
  HelpTopic,
  IHost,
  IMessage,
  IUserData,
  MathTopic,
  PasswordResetTopic,
  ResultType,
  RootTopic
} from "./topics";

const otherTopics = [
  MathTopic,
  AdvancedMathTopic,
  HelpTopic,
  PasswordResetTopic
];

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
  return init<IMessage, ResultType, IUserData, IHost>(
    RootTopic,
    DefaultTopic,
    otherTopics
  );
}

function fakeSaveState(obj: any) {
  return JSON.stringify(obj);
}

function fakeRecreateState(serialized: string) {
  return JSON.parse(serialized);
}

async function assertFor(
  handler: (
    message: IMessage,
    stateSerializedByHost: ISerializableEvalState | undefined,
    userData: IUserData,
    host: IHost,
    options?: { reuseState: boolean }
  ) => Promise<{ result: any; state: ISerializableEvalState }>,
  input: string,
  state: ISerializableEvalState | undefined,
  result: any,
  options?: { reuseState: boolean }
) {
  const realState = state ? fakeRecreateState(fakeSaveState(state)) : undefined;

  const message = {
    text: input
  };

  const output = await handler(
    message,
    realState,
    getUserData(),
    getHost(),
    options
  );

  output.result.should.equal(result);

  return output;
}

describe("Wild yak", () => {
  it("returns a handler on calling init()", async () => {
    const handler = getHandler();
    handler.should.be.an.instanceOf(Function);
  });

  it("enters the default topic while starting", async () => {
    const handler = getHandler();
    const output = await assertFor(
      handler,
      "hello world",
      undefined,
      "greetings comrade!"
    );
    output.state.topics.length.should.equal(1);
  });

  it("handles a message with the root topic if nothing else matches", async () => {
    const handler = getHandler();

    const output = await assertFor(
      handler,
      "something something!",
      undefined,
      "Life is like riding a bicycle. To keep your balance you must keep moving."
    );
    output.state.topics.length.should.equal(1);
  });

  it("enters a new topic", async () => {
    const handler = getHandler();

    const output1 = await assertFor(
      handler,
      "do basic math",
      undefined,
      "You can type a math expression"
    );

    const output2 = await assertFor(handler, "add 2 3", output1.state, 5);
    output2.state.topics.length.should.equal(1);

    const output3 = await assertFor(handler, "add 20 30", output2.state, 50);
    output3.state.topics.length.should.equal(1);
  });

  it("enters a subtopic and exits", async () => {
    const handler = getHandler();

    const output1 = await assertFor(
      handler,
      "do basic math",
      undefined,
      "You can type a math expression"
    );

    const output2 = await assertFor(handler, "add 2 3", output1.state, 5);
    output2.state.topics.length.should.equal(1);

    const output3 = await assertFor(
      handler,
      "do advanced math",
      output2.state,
      "You can do advanced math now."
    );
    output3.state.topics.length.should.equal(2);

    const output4 = await assertFor(handler, "exp 2 8", output3.state, 256);
    output4.state.topics.length.should.equal(2);

    const output5 = await assertFor(
      handler,
      "do basic math",
      output4.state,
      "Back to basic math."
    );

    const output6 = await assertFor(
      handler,
      "exp 2 8",
      output5.state,
      "I don't know how to handle this."
    );

    const output7 = await assertFor(handler, "add 2 8", output6.state, 10);
  });

  it("enters a top level topic and exits", async () => {
    const handler = getHandler();

    const output1 = await assertFor(
      handler,
      "help",
      undefined,
      "You're entering help mode. Type anything."
    );

    const output2 = await assertFor(
      handler,
      "syntax",
      output1.state,
      "HELP: This is just a test suite. Nothing to see here, sorry."
    );
    output2.state.topics.length.should.equal(0);
  });

  it("throws when state is reused", async () => {
    try {
      const handler = getHandler();

      const output1 = await assertFor(
        handler,
        "do basic math",
        undefined,
        "You can type a math expression"
      );

      const output2 = await assertFor(handler, "add 2 3", output1.state, 5);
      output2.state.topics.length.should.equal(1);

      const output3 = await assertFor(handler, "add 20 30", output1.state, 50);
    } catch (ex) {
      ex.message.should.equal(
        "This evaluation state was previously used. Cannot reuse."
      );
    }
  });

  it("doesn't throw when the reuse flag is set", async () => {
    const handler = getHandler();

    const output1 = await assertFor(
      handler,
      "do basic math",
      undefined,
      "You can type a math expression"
    );

    const output2 = await assertFor(handler, "add 2 3", output1.state, 5);
    output2.state.topics.length.should.equal(1);

    const output3 = await assertFor(handler, "add 20 30", output1.state, 50, {
      reuseState: true
    });
    output2.state.topics.length.should.equal(1);
  });

  it("persists stateful topics", async () => {
    const handler = getHandler();

    const output1 = await assertFor(
      handler,
      "reset password",
      undefined,
      "Set your password."
    );

    const output2 = await assertFor(
      handler,
      "hello",
      output1.state,
      "Repeat your password."
    );
    output2.state.topics.length.should.equal(1);

    const output3 = await assertFor(
      handler,
      "world",
      output2.state,
      "Password don't match. Reenter both passwords."
    );
    output3.state.topics.length.should.equal(1);

    const output4 = await assertFor(
      handler,
      "hello",
      output3.state,
      "Repeat your password."
    );
    output4.state.topics.length.should.equal(1);

    const output5 = await assertFor(
      handler,
      "hello",
      output4.state,
      "Password reset complete."
    );
    output4.state.topics.length.should.equal(1);
  });
});
