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
export type InitType<TInitArgs, TContext: ContextType> = (args: TInitArgs, session: ExternalSessionType) => Promise<TContext>;
export type TopicType<TInitArgs, TContext: ContextType> = {
  name: string,
  isRoot: boolean,
  init: InitType<TInitArgs, TContext>,
  onEntry?: (state: StateType<TContext>) => void,
  hooks?: Array<HookType<TContext, Object, Object, MessageType>>
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
export type ContextType = {
  activeHooks: Array<string>,
  disabledHooks: Array<string>,
  yakSession?: YakSessionType,
  topic: TopicType,
  cb?: Function
}

/*
  Parse a message. Takes in a message and returns a ParseResult.
  The ParseResult is passed on to the Handler.
*/
export type TParse<TContext: ContextType, TMessage: MessageType, TParseResult> = (state: StateType<TContext>, message?: TMessage)  => Promise<?TParseResult>;

/*
  Recieves a ParseResult from the Parse() function. Handler can optionally return a result.
*/
export type THandler<TContext: ContextType, THandlerArgs, THandlerResult> = (state: StateType<TContext>, args: THandlerArgs) => Promise<?THandlerResult>;

/*
  The Hook. Contains a name, a parse(): TParse function, a handler(): THandler
*/
export type HookType<TContext: ContextType, TMessage: MessageType, TParseResult, THandlerResult> = {
  name: string,
  parse: TParse<TContext, TMessage, TParseResult>,
  handler: THandler<TContext, TParseResult, THandlerResult>
};

/*
  State that is passed into every function.
  Contains a context and an external session.
  The external session helps the topic work with application state.
  eg: session.shoppingCart.items.count
*/
export type StateType<TContext: ContextType> = {
  context: TContext,
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

/*
  Called when exiting a topic.
  This is a selector for a method on the parentTopic
*/
export type TopicExitCallback<TInitArgs, TContext: ContextType, TCallbackArgs, TCallbackResult> = (topic: TopicType<TInitArgs, TContext>) =>
  THandler<TContext, TCallbackArgs, TCallbackResult>
