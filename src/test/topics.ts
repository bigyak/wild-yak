import { IEvalState, IHandlerResult, ITopic, TopicBase } from "..";

export interface IMessage {
  timestamp?: number;
  text: string;
}

export interface IUserData {
  username: string;
  session: string;
}

export interface IHost {
  getUserDirectory(username: string): string;
}

export class DefaultTopic extends TopicBase<IMessage, IUserData, IHost>
  implements ITopic<IMessage, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult> {
    return message.text === "hello world"
      ? { handled: true, result: "greetings comrade!" }
      : { handled: false };
  }

  isTopLevel() {
    return true;
  }
}

export class RootTopic extends TopicBase<IMessage, IUserData, IHost>
  implements ITopic<IMessage, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult> {
    if (message.text === "do math") {
      this.enterTopic(state, new MathTopic());
      return { handled: true, result: "You can type a math expression" };
    } else {
      return {
        handled: true,
        result:
          "Life is like riding a bicycle. To keep your balance you must keep moving."
      };
    }
  }
}

export class MathTopic extends TopicBase<IMessage, IUserData, IHost>
  implements ITopic<IMessage, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult> {
    if (message.text === "do advanced math") {
      this.enterTopic(state, new AdvancedMathTopic());
      return {
        handled: true,
        result: "You can do advanced math now."
      };
    } else {
      return {
        handled: true,
        result: eval(message.text)
      };
    }
  }

  isTopLevel() {
    return true;
  }
}

export class AdvancedMathTopic extends TopicBase<IMessage, IUserData, IHost>
  implements ITopic<IMessage, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult> {
    return {
      handled: true,
      result: eval(message.text)
    };
  }

  isTopLevel() {
    return true;
  }
}

// const mainTopic = createTopic<IMessage, IUserData>()(
//   "main",
//   async (m: boolean) => {
//     env._enteredMain = true;
//     return true;
//   }
// )({
//   afterInit: async state => {
//     if (
//       env.enterTopic_assertTopContextTest ||
//       env.exitTopic_assertTopContextTest
//     ) {
//       env._mainState = state;
//       await enterTopic(state, nicknameTopic, mainTopic, 1);
//     }
//   },
//   conditions: [
//     createCondition(
//       "respond-to-hello",
//       regex([/^Hello (.*)$/]),
//       async (state, { matches }) => {
//         return "hey, what's up!";
//       }
//     ),
//     createCondition(
//       "boomshanker",
//       async (state, message) => {
//         if (message && message.text === "Boomshanker") {
//           return "zomg!";
//         }
//       },
//       async (state, zomg) => {
//         return `omg ${zomg}`;
//       }
//     )
//   ],
//   isRoot: true
// });

// const nicknameTopic = createTopic<IMessage, IUserData>()(
//   "nickname",
//   async (args: boolean) => {
//     env._enteredNickname = true;
//     return true;
//   }
// )({
//   afterInit: async () => {
//     if (env.enterTopic_assertTopContextTest) {
//       await enterTopic(env._mainState, defaultTopic, mathTopic);
//     }
//     if (env.exitTopic_assertTopContextTest) {
//       await exitTopic(env._mainState);
//     }
//   },
//   conditions: [
//     createCondition("testi", regex([/^name$/]), async (x, y) => 1)
//   ],

//   isRoot: true
// });

// const mathTopic = createTopic<IMessage, IUserData>()(
//   "math",
//   async (args: void, userData?: IUserData) => {
//     env._enteredMath = true;
//   }
// )({
//   isRoot: true
// });

// const wildcardTopic = createTopic<IMessage, IUserData>()(
//   "wildcard",
//   async (args: void, userData?: IUserData) => {
//     env._enteredWildcard = true;
//   }
// )({
//   afterInit: async state => {
//     if (env._disabled !== undefined) {
//       disableConditions(state, env._disabled);
//     }
//     if (env._enabled !== undefined) {
//       disableConditionsExcept(state, env._enabled);
//     }
//   },
//   isRoot: true
// });

// const mathExpTopic = createTopic<IMessage, IUserData>()(
//   "mathexp",
//   async (args: void, userData?: IUserData) => {
//     env._enteredMathExp = true;
//   }
// )({
//   isRoot: true
// });

// async function onValidateName(
//   state: IApplicationState<any, IMessage, IUserData | undefined>,
//   args: { success: boolean; name: string }
// ) {
//   const { success, name } = args;
//   env._enteredOnValidateName = true;
//   return `you signed up as ${name}.`;
// }

// const signupTopic = createTopic<IMessage, IUserData>()(
//   "signup",
//   async (args: void, userData?: IUserData) => {
//     env._enteredSignup = true;
//   }
// )({
//   callbacks: {
//     onValidateName
//   },
//   conditions: [
//     createCondition(
//       "validate",
//       regex([/^name$/]),
//       async (state, { matches }) => {
//         await enterTopic(
//           state,
//           validateTopic,
//           signupTopic,
//           { P: true },
//           onValidateName
//         );
//       }
//     )
//   ],
//   isRoot: true
// });

// const validateTopic = createTopic<IMessage, IUserData>()(
//   "validate",
//   async (args: { P: boolean } | undefined, userData?: IUserData) => {
//     env._enteredValidate = true;
//   }
// )({
//   conditions: [
//     createCondition(
//       "validate",
//       regex([/^name (.*)$/]),
//       async (state, { matches }) => {
//         if (!env._clearAllTopics) {
//           await exitTopic(state, { success: true });
//         } else {
//           await clearAllTopics(state);
//         }
//       }
//     )
//   ]
// });

// const defaultTopic = createTopic<IMessage, IUserData>()(
//   "default",
//   async (args, userData) => {
//     env._enteredDefault = true;
//   }
// )({
//   isRoot: false
// });

// const globalTopic = createTopic<IMessage, IUserData>()(
//   "global",
//   async (args, userData) => undefined
// )({
//   conditions: [
//     createCondition(
//       "nickname",
//       regex([/^nick ([A-z]\w*)$/, /^nickname ([A-z]\w*)$/]),
//       async (state, { matches }) => {
//         await enterTopic(state, nicknameTopic, globalTopic, matches[1]);
//       }
//     ),
//     createCondition(
//       "calc",
//       async (state, message) => {
//         const regexpr = /^[0-9\(\)\+\-*/\s]+$/;
//         if (message && regexpr.exec(message.text) !== null) {
//           try {
//             return eval(message.text);
//           } catch (e) {
//             console.log(e);
//           }
//         }
//       },
//       async (state, result) => {
//         await enterTopic(state, mathTopic, globalTopic, result);
//       }
//     ),
//     createCondition(
//       "wildcard",
//       regex([/^wildcard ([A-z].*)$/, /^wild ([A-z].*)$/]),
//       async (state, { matches }) => {
//         await enterTopic(state, wildcardTopic, globalTopic, matches[1]);
//       }
//     ),
//     createCondition(
//       "mathexp",
//       regex([/^5 \+ 10$/, /^100\/4$/]),
//       async (state, { matches }) => {
//         await enterTopic(state, mathExpTopic, globalTopic, matches[0]);
//       }
//     ),
//     createCondition(
//       "signup",
//       regex([/^signup (.*)$/]),
//       async (state, { matches }) => {
//         await enterTopic(state, signupTopic, globalTopic, matches[1]);
//       }
//     ),
//     createCondition(
//       "default",
//       async (state, message: IMessage) => {
//         return message;
//       },
//       async (state, message: IMessage) => {
//         await enterTopic(state, defaultTopic, globalTopic, message);
//       }
//     )
//   ],
//   isRoot: true
// });

// const allTopics = [
//   globalTopic,
//   mainTopic,
//   nicknameTopic,
//   mathTopic,
//   wildcardTopic,
//   mathExpTopic,
//   signupTopic,
//   validateTopic,
//   defaultTopic
// ];

// const topics =
//   options && options.includeMain
//     ? allTopics
//     : allTopics.filter(t => t.name !== "main");
