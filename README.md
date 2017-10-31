# wild-yak
The Yak

Mini-documentation
------------------------
App is built as a bunch of topics. Each topic has "hooks", which are regexes (or custom functions) that evaluate user input, changes the state accordingly, and returns a response(s). A hook may also move the user to a different topic. Once the topic changes, further user inputs are evaluated by new hooks. In addition, there is a global topic - which gets to evaluate inputs when none of the current topics hooks match the input.

eg:
```
(Currently in Welcome Topic)
Bot: What do you wanna try today?
[Math] [Physics]
User: Math
(Switch to Math Topic)
B: Type an expression
U: 2 + 4
B: Ans 6. Type again. Or type 'exit' to go back.
U: exit
(Switch back to Welcome Topic)
B: What do you wanna try today?
[Math] [Physics]
```

Usage can be seen in https://github.com/yak-ai/wild-yak/blob/master/src/test/topics.js
It looks very ugly, sorry.

Yes, this has been well tested in production.
