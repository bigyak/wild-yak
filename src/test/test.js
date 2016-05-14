import __polyfill from "babel-polyfill";
import should from "should";
import { init, enterTopic } from "../wild-yak";
import getTopics from "./topics";

describe("Wild yak", () => {

  it("init() returns a handler", async () => {
    const { env, topics } = getTopics();
    const handler = await init(topics);
    handler.should.be.an.instanceOf(Function);
  });

  it("Enters main::onEntry(session, message) while starting", async () => {
    let _enteredMain = false;
    let _session, _message;

    const { env, topics } = getTopics({
      main: {
        onEntry: async (session, message) => {
          _enteredMain = true;
          _session = session;
          _message = message;
        }
      }
    });

    const message = { text: "Hello world" };
    const session = { id: "0943234" }

    const handler = await init(topics);

    await handler(session, message);
    _enteredMain.should.be.true();
    _session.should.equal(session);
    _message.should.equal(message);
  });


  it("Runs a hook when pattern matches", async () => {
    let _enteredNickname = false;
    let _session, _name;

    const { env, topics } = getTopics({
      nickname: {
        onEntry: async (session, name) => {
          _enteredNickname = true;
          _session = session;
          _name = name;
        }
      }
    });

    const message = { text: "nickname yakyak" };
    const session = { id: "0943234" }

    const handler = await init(topics);

    await handler(session, message);
    _enteredNickname.should.be.true();
    _session.should.equal(session);
    _name.should.equal("yakyak");
  });
})
