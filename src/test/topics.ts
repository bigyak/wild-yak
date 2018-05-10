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

export type ResultType = string | number | undefined;

function basicMathOperators(text: string) {
  const [p1, p2, p3] = text.split(" ");
  const [operand1, operand2] = [parseInt(p2, 10), parseInt(p3, 10)];
  return p1 === "add"
    ? operand1 + operand2
    : p1 === "substract"
      ? operand1 - operand2
      : p1 === "multiply"
        ? operand1 * operand2
        : p1 === "divide"
          ? operand1 / operand2
          : undefined;
}

function advancedMathOperators(text: string) {
  const result = basicMathOperators(text);
  return result === undefined
    ? (() => {
        const [p1, p2, p3] = text.split(" ");
        const [operand1, operand2] = [parseInt(p2, 10), parseInt(p3, 10)];
        return p1 === "exp" ? operand1 ** operand2 : undefined;
      })()
    : result;
}

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

export class MathTopic extends TopicBase<IMessage, ResultType, IUserData, IHost>
  implements ITopic<IMessage, ResultType, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, ResultType, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult<ResultType>> {
    if (message.text === "do advanced math") {
      this.enterTopic(state, new AdvancedMathTopic());
      return {
        handled: true,
        result: "You can do advanced math now."
      };
    } else {
      const result = basicMathOperators(message.text);
      return {
        handled: true,
        result:
          typeof result !== "undefined"
            ? result
            : "I don't know how to handle this."
      };
    }
  }

  isTopLevel() {
    return true;
  }
}

export class AdvancedMathTopic
  extends TopicBase<IMessage, ResultType, IUserData, IHost>
  implements ITopic<IMessage, ResultType, IUserData, IHost> {
  async handle(
    state: IEvalState<IMessage, ResultType, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult<ResultType>> {
    if (message.text === "do basic math") {
      this.exitTopic(state);
      return {
        handled: true,
        result: "Back to basic math."
      };
    } else {
      const result = advancedMathOperators(message.text);
      return {
        handled: true,
        result:
          typeof result !== "undefined"
            ? result
            : "I don't know how to handle this."
      };
    }
  }

  isTopLevel() {
    return false;
  }
}

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

export class PasswordResetTopic
  extends TopicBase<IMessage, ResultType, IUserData, IHost>
  implements ITopic<IMessage, ResultType, IUserData, IHost> {
  password?: string;
  repeatPassword?: string;

  async handle(
    state: IEvalState<IMessage, ResultType, IUserData, IHost>,
    message: IMessage,
    userData: IUserData,
    host: IHost
  ): Promise<IHandlerResult<ResultType>> {
    if (!this.password) {
      this.password = message.text;
      return {
        handled: true,
        result: "Repeat your password."
      };
    } else {
      if (message.text === this.password) {
        this.exitTopic(state);
        return {
          handled: true,
          result: "Password reset complete."
        };
      } else {
        this.password = undefined;
        return {
          handled: true,
          result: "Password don't match. Reenter both passwords."
        };
      }
    }
  }

  isTopLevel() {
    return true;
  }
}
