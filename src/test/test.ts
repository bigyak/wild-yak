// import "mocha";
// import "should";
// import {
//   init,
//   enterTopic,
//   exitTopic,
//   disableHooks,
//   disableHooksExcept,
//   IncomingStringMessageType
// } from "../wild-yak";
// import getTopics from "./topics";

// describe("Wild yak", () => {
//   function getSession() {
//     return {
//       id: Math.random()
//         .toString(36)
//         .substring(16),
//       type: "web",
//       user: {
//         id: "iron_maiden",
//         name: "Iron Maiden",
//         firstName: "Iron",
//         lastName: "Maiden"
//       }
//     };
//   }

//   function getSessionId(userData) {
//     return userData.id;
//   }
//   function getSessionType(userData) {
//     return userData.type;
//   }

//   it("init() returns a handler", async () => {
//     const { env, topics } = getTopics();
//     const handler = await init(topics);
//     handler.should.be.an.instanceOf(Function);
//   });

//   it("Enters topic main while starting", async () => {
//     const { env, topics } = getTopics({ includeMain: true });
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "Hello world"
//     };
//     const handler = await init(topics);
//     await handler(message);

//     env._enteredMain.should.be.true();
//   });

//   it("Returns a message from a pattern", async () => {
//     const { env, topics } = getTopics({ includeMain: true });
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "Hello world"
//     };
//     const handler = await init(topics);
//     const result = await handler(message);

//     env._enteredMain.should.be.true();
//     result.messages[0].text.should.equal("hey, what's up!");
//   });

//   it("Returns a message from a hook", async () => {
//     const { env, topics } = getTopics({ includeMain: true });
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "Boomshanker"
//     };
//     const handler = await init(topics);
//     const result = await handler(message);

//     env._enteredMain.should.be.true();
//     result.messages[0].text.should.equal("omg zomg!");
//   });

//   it("Runs a topic when pattern matches", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "nickname yakyak"
//     };
//     const handler = await init(topics);
//     await handler(message);

//     env._enteredNickname.should.be.true();
//   });

//   it("Runs a custom hook (non-regex)", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "5 + 10"
//     };
//     const handler = await init(topics);
//     await handler(message);

//     env._enteredMath.should.be.true();
//   });

//   it("Run the default hook if nothing matches", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "somethingweird"
//     };
//     const handler = await init(topics);
//     await handler(message);

//     env._enteredDefault.should.be.true();
//   });

//   it("Disables hooks", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "wildcard going to be alone"
//     };
//     const handler = await init(topics);
//     await handler(message);

//     env._enteredWildcard.should.be.true();
//   });

//   it("Runs a hook for each message", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "wildcard going to be alone"
//     };
//     const handler = await init(topics);
//     env._disabled = ["nickname"];
//     const result = await handler(message);

//     env._enteredWildcard.should.be.true();

//     const message2: IncomingStringMessageType = {
//       type: "string",
//       text: "nickname yakyak"
//     };
//     await handler(message2, result.conversation);

//     env._enteredDefault.should.be.true();
//   });

//   it("Disables hooks except specified hooks", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "wildcard disableHooksExcept mathexp"
//     };
//     const handler = await init(topics);
//     env._enabled = ["mathexp"];
//     const result = await handler(message);

//     env._enteredWildcard.should.be.true();

//     const message2: IncomingStringMessageType = {
//       type: "string",
//       text: "5 + 10"
//     };
//     await handler(message2, result.conversation);

//     env._enteredMathExp.should.be.true();
//   });

//   it("Receives result from sub topic via callback", async () => {
//     const { env, topics } = getTopics();
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "signup Yak"
//     };
//     const handler = await init(topics);
//     const result1 = await handler(message);
//     env._enteredSignup.should.be.true();

//     const message2: IncomingStringMessageType = {
//       type: "string",
//       text: "name"
//     };
//     const result2 = await handler(message2, result1.conversation);
//     env._enteredValidate.should.be.true();

//     const message3: IncomingStringMessageType = {
//       type: "string",
//       text: "name Hemchand"
//     };
//     const result3 = await handler(message3, result2.conversation);

//     env._enteredOnValidateName.should.be.true();
//     result3.conversation.contexts.length.should.equal(1);
//   });

//   it("Clears all topics", async () => {
//     const { env, topics } = getTopics();
//     env._clearAllTopics = true;
//     const message1: IncomingStringMessageType = {
//       type: "string",
//       text: "signup Yak"
//     };
//     const handler = await init(topics);
//     const result1 = await handler(message1);
//     const message2: IncomingStringMessageType = {
//       type: "string",
//       text: "name"
//     };
//     const result2 = await handler(message2, result1.conversation);
//     const message3: IncomingStringMessageType = {
//       type: "string",
//       text: "name Hemchand"
//     };
//     const result3 = await handler(message3, result2.conversation);

//     result3.conversation.contexts.length.should.equal(0);
//   });

//   it("Throws error on enterTopic() if the provided context isn't on the top of the stack", async () => {
//     const { env, topics } = getTopics({ includeMain: true });
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "Hello world"
//     };
//     const handler = await init(topics);

//     env.enterTopic_assertTopContextTest = true;

//     let _threwError = false;
//     try {
//       await handler(message);
//     } catch (e) {
//       _threwError = true;
//       e.message.should.equal(
//         "You can only enter a new context from the last context."
//       );
//     }

//     _threwError.should.be.true();
//   });

//   it("Throws error on exitTopic() if the provided context isn't on the top of the stack", async () => {
//     const { env, topics } = getTopics({ includeMain: true });
//     const message: IncomingStringMessageType = {
//       type: "string",
//       text: "Hello world"
//     };

//     const handler = await init(topics);

//     env.exitTopic_assertTopContextTest = true;

//     let _threwError = false;
//     try {
//       await handler(message);
//     } catch (e) {
//       _threwError = true;
//       e.message.should.equal("You can only exit from the current context.");
//     }

//     _threwError.should.be.true();
//   });
// });
