/* @flow */

/*
  Represents the application controlled session state
*/
export type ExternalSessionType = Object;

/*
  Message types that will be passed to the Yak
*/
export type StringMessageType = { type: "string", text: string };
export type OptionMessageType = { type: "option", values: Array<string> };
export type MessageType = StringMessageType | OptionMessageType;

/*
  Definition of a Topic.
*/
export type TopicParams<TContextData> = {
  isRoot: boolean,
  hooks: Array<HookType<TContextData, Object, Object, MessageType>>
}
export type TopicType<TInitArgs, TContextData> = {
  name: string,
  init: (args: TInitArgs, session: ExternalSessionType) => Promise<TContextData>,
  isRoot: boolean,
  hooks: Array<HookType<TContextData, Object, Object, MessageType>>,
  afterInit?: ?(state: StateType<TContextData>, session: ExternalSessionType) => void
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
export type TParse<TContextData, TMessage: MessageType, TParseResult> = (state: StateType<TContextData>, message?: TMessage)  => Promise<?TParseResult>;

/*
  Recieves a ParseResult from the Parse() function. Handler can optionally return a result.
*/
export type THandler<TContextData, THandlerArgs, THandlerResult> = (state: StateType<TContextData>, args: THandlerArgs) => Promise<?THandlerResult>;

/*
  The Hook. Contains a name, a parse(): TParse function, a handler(): THandler
*/
export type HookType<TContextData, TMessage: MessageType, TParseResult, THandlerResult> = {
  name: string,
  parse: TParse<TContextData, TMessage, TParseResult>,
  handler: THandler<TContextData, TParseResult, THandlerResult>
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
  message: StringMessageType,
  i: number,
  matches: Array<string>
}
