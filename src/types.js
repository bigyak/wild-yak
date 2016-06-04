/* @flow */

/*
  Represents the application controlled session state
*/
export type ExternalSessionType = Object;

/*
  Message types that will be passed to the Yak
*/
export type IncomingStringMessageType = {
  type: "string",
  text: string,
  timestamp: number
};
export type IncomingMessageType = IncomingStringMessageType;

export type OutgoingStringMessageType = { type: "string", text: string };
export type OptionMessageType = { type: "option", values: Array<string> };
export type OutgoingMessageType = OutgoingStringMessageType | OptionMessageType;

/*
  Definition of a Topic.
*/
export type TopicParams<TContextData> = {
  isRoot: boolean,
  hooks: Array<HookType<TContextData, Object, Object, IncomingMessageType>>
}
export type TopicType<TInitArgs, TContextData> = {
  name: string,
  init: (args: TInitArgs, session: ExternalSessionType) => Promise<TContextData>,
  isRoot: boolean,
  callbacks?: ?Array<(state: any, params: any) => Promise>,
  hooks: Array<HookType<TContextData, Object, Object, IncomingMessageType>>,
  afterInit?: ?(state: StateType<TContextData>, session: ExternalSessionType) => Promise
}

/*
  Yak Session contains Yak specific state.
  Like contexts, virginity etc.
*/
export type YakSessionType = {
  topics: Array<TopicType<Object, ContextType>>,
  contexts: Array<ContextType>,
  virgin: boolean
}

/*
  The topic. This is where each topic stores its state.
*/
export type ContextType<TContextData> = {
  data?: TContextData,
  activeHooks: Array<string>,
  disabledHooks: Array<string>,
  yakSession: YakSessionType,
  topic: TopicType,
  cb?: Function
}

/*
  Parse a message. Takes in a message and returns a ParseResult.
  The ParseResult is passed on to the Handler.
*/
export type ParseFuncType<TContextData, TMessage: IncomingMessageType, TParseResult> = (state: StateType<TContextData>, message?: TMessage)  => Promise<?TParseResult>;

/*
  Recieves a ParseResult from the Parse() function. Handler can optionally return a result.
*/
export type HandlerFuncType<TContextData, THandlerArgs, THandlerResult> = (state: StateType<TContextData>, args: THandlerArgs) => Promise<?THandlerResult>;

/*
  The Hook. Contains a name, a parse(): ParseFuncType function, a handler(): HandlerFuncType
*/
export type HookType<TContextData, TMessage: IncomingMessageType, TParseResult, THandlerResult> = {
  name: string,
  parse: ParseFuncType<TContextData, TMessage, TParseResult>,
  handler: HandlerFuncType<TContextData, TParseResult, THandlerResult>
};

/*
  State that is passed into every function.
  Contains a context and an external session.
  The external session helps the topic work with application state.
  eg: session.shoppingCart.items.count
*/
export type StateType<TContextData> = {
  context: ContextType<TContextData>,
  session: ExternalSessionType
}

/*
  The resumt of a RegExp parser.
  Contains original message, index of matched pattern, and a list of matches.
*/
export type RegexParseResultType = {
  message: IncomingStringMessageType,
  i: number,
  matches: Array<string>
}

/*
  A handler can return a single response or an array of responses.
*/
export type HandlerResultType = OutgoingMessageType | Array<OutgoingMessageType>;

/*
  Message Formats coming in from external systems.
    a) facebook
    b) web
    c) Twitter //todo
*/
type FbIncomingMessageBaseType = {
  sender: { id: string },
  recipient: { id: string},
  timestamp: number,
  message: {
    mid: string,
    seq: number
  },
  postback?: {
    payload: string
  }
};
export type FbIncomingStringMessageType = FbIncomingMessageBaseType & { message: { text: string } }
export type FbIncomingMessageType = FbIncomingStringMessageType;

type WebIncomingMessageBaseType = {
  timestamp: number
};
export type WebIncomingStringMessageType = WebIncomingMessageBaseType & { text?: ?string };
export type WebIncomingMessageType = WebIncomingStringMessageType;

export type ExternalIncomingMessageType = FbIncomingMessageType | WebIncomingMessageType;

/*
  Message Formats which we send to external systems.
    a) facebook
    b) web
    c) Twitter //todo
*/
export type FbOutgoingStringMessageType = { type: "string", text: string };
export type FbOutgoingOptionMessageType = { type: "option", values: Array<string> };
export type FbOutgoingMessageType = FbOutgoingStringMessageType | FbOutgoingOptionMessageType;

export type WebOutgoingStringMessageType = { type: "string", text: string };
export type WebOutgoingOptionMessageType = { type: "option", values: Array<string> };
export type WebOutgoingMessageType = WebOutgoingStringMessageType | WebOutgoingOptionMessageType;

export type ExternalOutgoingMessageType = FbOutgoingMessageType | WebOutgoingMessageType;
