import __polyfill from "babel-polyfill";
import should from "should";
import { init, enterTopic, exitTopic } from "../wild-yak";
import getTopics from "./topics";

describe("Wild yak", () => {

  it("init() returns a handler", async () => {
    const { env, topics } = getTopics();
    const handler = await init(topics);
    handler.should.be.an.instanceOf(Function);
  });

  it("Enters main::onEntry(session, message) while starting", async () => {
    let _enteredMain = false;
    let _message;

    const { env, topics } = getTopics({
      main: {
        onEntry: async (context, message) => {
          _enteredMain = true;
          _message = message;
          await exitTopic(context);
        }
      }
    });

    const message = { text: "Hello world" };
    const session = { id: "0943234" }

    const handler = await init(topics);

    await handler(session, message);
    _enteredMain.should.be.true();
    _message.should.equal(message);
  });


  it("Runs a hook when pattern matches", async () => {
    let _enteredNickname = false;
    let _name;

    const { env, topics } = getTopics({
      nickname: {
        onEntry: async (context, name) => {
          _enteredNickname = true;
          _name = name;
        }
      }
    });

    const message = { text: "nickname yakyak" };
    const session = { id: "0943234" }

    const handler = await init(topics);

    await handler(session, message);
    _enteredNickname.should.be.true();
    _name.should.equal("yakyak");
  });


  it("Runs a hook when you write a mathematical calculation", async () => {
    let _enteredMath = false;
    let _result;

    const { env, topics } = getTopics({
      math: {
        onEntry: async (context, result) => {
          _enteredMath = true;
          _result = result;
        }
      }
    });

    const message = { text: "5 + (6/2) + 10" };
    const session = { id: "0943235" }

    const handler = await init(topics);

    await handler(session, message);
    _enteredMath.should.be.true();
    _result.should.equal(5 + (6/2) + 10);
  });

})
