# wild-yak

Wild Yak is a state machine which can be used to make conversational bots.

The state machine is organized as topics, with one topic active at a time. A topic is a class defining a method called handle() which receives user input and responds to it. The handle() method may also activate another topic as a result of an input. All inputs go the currently active topic.

There are two special topics - RootTopic and DefaultTopic. The handle method of the RootTopic is invoked when the currently active topic chooses not to handle an input. The DefaultTopic is the first topic to be set as active after initialization.

The full source for the examples below can be seen at: https://github.com/bigyak/wild-yak/blob/master/src/test
Going through the tests will be the best way to learn how to use this library.

Before doing anything, we need to define four data types:

* IMessage defines the input or message format the topics will handle
* ResultType is the response format from a topic's handler
* IUserData defines user information which may be needed by the topics
* IHost defines any external interfaces the bot might need

```typescript
export interface IMessage {
  timestamp?: number;
  text: string;
}

export type ResultType = string | number | undefined;

export interface IUserData {
  username: string;
  session: string;
}

export interface IHost {
  getUserDirectory(username: string): string;
}
```

Now let's define a rootTopic. All Topics inherit from TopicBase and implement ITopic. This topic handles three specific messages ("do basic math", "help", "reset password") all of which activate other topics, and a generic response if it doesn't understand the input.

```typescript
export class RootTopic extends TopicBase<IMessage, ResultType, IUserData, IHost>
  implements ITopic<IMessage, ResultType, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, ResultType, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult<ResultType>> {
    if (message.text === "do basic math") {
      this.enterTopic(state, new MathTopic());
      return { handled: true, result: "You can type a math expression" };
    } else if (message.text === "help") {
      this.enterTopic(state, new HelpTopic());
      return {
        handled: true,
        result: "You're entering help mode. Type anything."
      };
    } else if (message.text === "reset password") {
      this.enterTopic(state, new PasswordResetTopic());
      return {
        handled: true,
        result: "Set your password."
      };
    } else {
      return {
        handled: true,
        result:
          "Life is like riding a bicycle. To keep your balance you must keep moving."
      };
    }
  }
}
```

Let's also define a defaultTopic, which is the first topic to be loaded when the app starts. Its purpose in life is very simple - if it receives "hello world" it will respond with "greetings comrade!".

```typescript
export class DefaultTopic
  extends TopicBase<IMessage, ResultType, IUserData, IHost>
  implements ITopic<IMessage, ResultType, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, ResultType, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult<ResultType>> {
    return message.text === "hello world"
      ? { handled: true, result: "greetings comrade!" }
      : { handled: false };
  }

  isTopLevel() {
    return true;
  }
}
```

As you can see, all Topic classes look similar. Let's go ahead and define another topic called HelpTopic - which you might have seen referred in the RootTopic. If the input is "help" the RootTopic will activate the HelpTopic.

```typescript
export class HelpTopic extends TopicBase<IMessage, ResultType, IUserData, IHost>
  implements ITopic<IMessage, ResultType, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, ResultType, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult<ResultType>> {
    this.exitTopic(state);
    return {
      handled: true,
      result: "HELP: This is just a test suite. Nothing to see here, sorry."
    };
  }

  isTopLevel() {
    return true;
  }
}
```

Now that we have some Topics, let's call init(). This returns a handler to which you can pass inputs. The result of calling handler with the input message will contain the response from the topics.

```typescript
async function run() {
  const otherTopics = [
    MathTopic,
    AdvancedMathTopic,
    HelpTopic,
    PasswordResetTopic
  ];
  const handler = init<IMessage, ResultType, IUserData, IHost>(
    RootTopic,
    DefaultTopic,
    otherTopics
  );

  const message = { text: "hello world" };
  const state = undefined;
  const userData = { username: "jeswin", session: "abcd" };
  const host = {
    getUserDirectory(username: string) {
      return "/home/jeswin";
    }
  };
  const output = await handler(message, state, userData, host);
}
```

We can continue the conversation by passing more messages the handler. But remember to send the most recent state along with the input. In the following example, notice that the second call passes the state retrieved from the previous response. This allows each topic to maintain internal state.

Continuing from the last example: 

```typescript
async function run() {
  // omitted for brevity...
  const output = await handler(message, state, userData, host);
  
  const message2 = "help";
  const output2 = await handler(message2, output.state, userData, host);
}
```

As mentioned earlier, the best way to get started with the project is by going through the tests.

Reach out to me if you have questions. @d2vneic0a0Y7OoRYvhXf+nCOBIV/lFQXHmOcHNr/3/I=.ed25519 on Secure ScuttleButt.