//AMD insanity
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        root._hyperscript = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    return (function () {
            'use strict';

            //-----------------------------------------------
            // Lexer
            //-----------------------------------------------
            var _lexer = function () {
                var OP_TABLE = {
                    '+': 'PLUS',
                    '-': 'MINUS',
                    '*': 'MULTIPLY',
                    '.': 'PERIOD',
                    '\\': 'BACKSLASH',
                    ':': 'COLON',
                    '%': 'PERCENT',
                    '|': 'PIPE',
                    '!': 'EXCLAMATION',
                    '?': 'QUESTION',
                    '#': 'POUND',
                    '&': 'AMPERSAND',
                    ';': 'SEMI',
                    ',': 'COMMA',
                    '(': 'L_PAREN',
                    ')': 'R_PAREN',
                    '<': 'L_ANG',
                    '>': 'R_ANG',
                    '{': 'L_BRACE',
                    '}': 'R_BRACE',
                    '[': 'L_BRACKET',
                    ']': 'R_BRACKET',
                    '=': 'EQUALS'
                };

                function isValidCSSClassChar(c) {
                    return isAlpha(c) || isNumeric(c) || c === "-" || c === "_";
                }

                function isValidCSSIDChar(c) {
                    return isAlpha(c) || isNumeric(c) || c === "-" || c === "_" || c === ":";
                }

                function isWhitespace(c) {
                    return c === " " || c === "\t" || isNewline(c);
                }

                function positionString(token) {
                    return "[Line: " + token.line + ", Column: " + token.col + "]"
                }

                function isNewline(c) {
                    return c === '\r' || c === '\n';
                }

                function isNumeric(c) {
                    return c >= '0' && c <= '9';
                }

                function isAlpha(c) {
                    return (c >= 'a' && c <= 'z') ||
                        (c >= 'A' && c <= 'Z');
                }


                function makeTokensObject(tokens, consumed, source) {

                    function raiseError(tokens, error) {
                        _parser.raiseParseError(tokens, error);
                    }

                    function requireOpToken(value) {
                        var token = matchOpToken(value);
                        if (token) {
                            return token;
                        } else {
                            raiseError(this, "Expected '" + value + "' but found '" + currentToken().value + "'");
                        }
                    }

                    function matchOpToken(value) {
                        if (currentToken() && currentToken().op && currentToken().value === value) {
                            return consumeToken();
                        }
                    }

                    function requireTokenType(type1, type2, type3, type4) {
                        var token = matchTokenType(type1, type2, type3, type4);
                        if (token) {
                            return token;
                        } else {
                            raiseError(this, "Expected one of " + JSON.stringify([type1, type2, type3]));
                        }
                    }

                    function matchTokenType(type1, type2, type3, type4) {
                        if (currentToken() && currentToken().type && [type1, type2, type3, type4].indexOf(currentToken().type) >= 0) {
                            return consumeToken();
                        }
                    }

                    function requireToken(value, type) {
                        var token = matchToken(value, type);
                        if (token) {
                            return token;
                        } else {
                            raiseError(this, "Expected '" + value + "' but found '" + currentToken().value + "'");
                        }
                    }

                    function matchToken(value, type) {
                        var type = type || "IDENTIFIER";
                        if (currentToken() && currentToken().value === value && currentToken().type === type) {
                            return consumeToken();
                        }
                    }

                    function consumeToken() {
                        var match = tokens.shift();
                        consumed.push(match);
                        return match;
                    }

                    function hasMore() {
                        return tokens.length > 0;
                    }

                    function currentToken() {
                        return tokens[0];
                    }

                    return {
                        matchOpToken: matchOpToken,
                        requireOpToken: requireOpToken,
                        matchTokenType: matchTokenType,
                        requireTokenType: requireTokenType,
                        consumeToken: consumeToken,
                        matchToken: matchToken,
                        requireToken: requireToken,
                        list: tokens,
                        source: source,
                        hasMore: hasMore,
                        currentToken: currentToken
                    }
                }

                function tokenize(string) {
                    var source = string;
                    var tokens = [];
                    var position = 0;
                    var column = 0;
                    var line = 1;
                    var lastToken = "<START>";

                    while (position < source.length) {
                        consumeWhitespace();
                        if (currentChar() === "-" && nextChar() === "-") {
                            consumeComment();
                        } else {
                            if (!possiblePrecedingSymbol() && currentChar() === "." && isAlpha(nextChar())) {
                                tokens.push(consumeClassReference());
                            } else if (!possiblePrecedingSymbol() && currentChar() === "#" && isAlpha(nextChar())) {
                                tokens.push(consumeIdReference());
                            } else if (isAlpha(currentChar())) {
                                tokens.push(consumeIdentifier());
                            } else if (isNumeric(currentChar())) {
                                tokens.push(consumeNumber());
                            } else if (currentChar() === '"' || currentChar() === "'") {
                                tokens.push(consumeString());
                            } else if (OP_TABLE[currentChar()]) {
                                tokens.push(makeOpToken(OP_TABLE[currentChar()], consumeChar()));
                            }
                        }
                    }

                    return makeTokensObject(tokens, [], source);

                    function makeOpToken(type, value) {
                        var token = makeToken(type, value);
                        token.op = true;
                        return token;
                    }

                    function makeToken(type, value) {
                        return {
                            type: type,
                            value: value,
                            start: position,
                            end: position + 1,
                            column: column,
                            line: line
                        };
                    }

                    function consumeComment() {
                        while (currentChar() && !isNewline(currentChar())) {
                            consumeChar();
                        }
                        consumeChar();
                    }

                    function consumeClassReference() {
                        var classRef = makeToken("CLASS_REF");
                        var value = consumeChar();
                        while (isValidCSSClassChar(currentChar())) {
                            value += consumeChar();
                        }
                        classRef.value = value;
                        classRef.end = position;
                        return classRef;
                    }


                    function consumeIdReference() {
                        var idRef = makeToken("ID_REF");
                        var value = consumeChar();
                        while (isValidCSSIDChar(currentChar())) {
                            value += consumeChar();
                        }
                        idRef.value = value;
                        idRef.end = position;
                        return idRef;
                    }

                    function consumeIdentifier() {
                        var identifier = makeToken("IDENTIFIER");
                        var value = consumeChar();
                        while (isAlpha(currentChar())) {
                            value += consumeChar();
                        }
                        identifier.value = value;
                        identifier.end = position;
                        return identifier;
                    }

                    function consumeNumber() {
                        var number = makeToken("NUMBER");
                        var value = consumeChar();
                        while (isNumeric(currentChar())) {
                            value += consumeChar();
                        }
                        if (currentChar() === ".") {
                            value += consumeChar();
                        }
                        while (isNumeric(currentChar())) {
                            value += consumeChar();
                        }
                        number.value = value;
                        number.end = position;
                        return number;
                    }

                    function consumeString() {
                        var string = makeToken("STRING");
                        var startChar = consumeChar(); // consume leading quote
                        var value = "";
                        while (currentChar() && currentChar() !== startChar) {
                            if (currentChar() === "\\") {
                                consumeChar(); // consume escape char and move on
                            }
                            value += consumeChar();
                        }
                        if (currentChar() !== startChar) {
                            throw Error("Unterminated string at " + positionString(string));
                        } else {
                            consumeChar(); // consume final quote
                        }
                        string.value = value;
                        string.end = position;
                        return string;
                    }

                    function currentChar() {
                        return source.charAt(position);
                    }

                    function nextChar() {
                        return source.charAt(position + 1);
                    }

                    function consumeChar() {
                        lastToken = currentChar();
                        position++;
                        column++;
                        return lastToken;
                    }

                    function possiblePrecedingSymbol() {
                        return isAlpha(lastToken) || isNumeric(lastToken) || lastToken === ")" || lastToken === "}" || lastToken === "]"
                    }

                    function consumeWhitespace() {
                        while (currentChar() && isWhitespace(currentChar())) {
                            if (isNewline(currentChar())) {
                                column = 0;
                                line++;
                            }
                            consumeChar();
                        }
                    }
                }

                return {
                    tokenize: tokenize
                }
            }();

            //-----------------------------------------------
            // Parser
            //-----------------------------------------------
            var _parser = function () {

                var GRAMMAR = {}

                function addGrammarElement(name, definition) {
                    GRAMMAR[name] = definition;
                }

                function createParserContext(tokens) {
                    var currentToken = tokens.currentToken();
                    var source = tokens.source;
                    var lines = source.split("\n");
                    var line = currentToken ? currentToken.line - 1 : lines.length - 1;
                    var contextLine = lines[line];
                    var offset = currentToken ? currentToken.column : contextLine.length - 1;
                    return contextLine + "\n" + " ".repeat(offset) + "^^\n\n";
                }

                function raiseParseError(tokens, message) {
                    message = (message || "Unexpected Token : " + tokens.currentToken().value) + "\n\n" +
                        createParserContext(tokens);
                    var error = new Error(message);
                    error.tokens = tokens;
                    throw error
                }

                function parseElement(type, tokens, root) {
                    var expressionDef = GRAMMAR[type];
                    if (expressionDef) return expressionDef(_parser, tokens, root);
                }

                function parseAnyOf(types, tokens) {
                    for (var i = 0; i < types.length; i++) {
                        var type = types[i];
                        var expression = parseElement(type, tokens);
                        if (expression) {
                            return expression;
                        }
                    }
                }

                function parseHyperScript(tokens) {
                    return parseElement("hyperscript", tokens)
                }

                function transpile(node, defaultVal) {
                    if (node == null) {
                        return defaultVal;
                    }
                    var src = node.transpile();
                    if (node.next) {
                        return src + "\n" + transpile(node.next)
                    } else {
                        return src;
                    }
                }

                return {
                    // parser API
                    parseElement: parseElement,
                    parseAnyOf: parseAnyOf,
                    parseHyperScript: parseHyperScript,
                    raiseParseError: raiseParseError,
                    addGrammarElement: addGrammarElement,
                    transpile: transpile
                }
            }();

            //-----------------------------------------------
            // Runtime
            //-----------------------------------------------
            var _runtime = function () {
                var SCRIPT_ATTRIBUTES = ["_", "script", "data-script"];

                function matchesSelector(elt, selector) {
                    // noinspection JSUnresolvedVariable
                    var matchesFunction = elt.matches ||
                        elt.matchesSelector || elt.msMatchesSelector || elt.mozMatchesSelector
                        || elt.webkitMatchesSelector || elt.oMatchesSelector;
                    return matchesFunction && matchesFunction.call(elt, selector);
                }

                function makeEvent(eventName, detail) {
                    var evt;
                    if (window.CustomEvent && typeof window.CustomEvent === 'function') {
                        evt = new CustomEvent(eventName, {bubbles: true, cancelable: true, detail: detail});
                    } else {
                        evt = document.createEvent('CustomEvent');
                        evt.initCustomEvent(eventName, true, true, detail);
                    }
                    return evt;
                }

                function triggerEvent(elt, eventName, detail) {
                    var detail = detail || {};
                    detail["sentBy"] = elt;
                    var event = makeEvent(eventName, detail);
                    var eventResult = elt.dispatchEvent(event);
                    return eventResult;
                }

                function forEach(arr, func) {
                    if (arr.length) {
                        for (var i = 0; i < arr.length; i++) {
                            func(arr[i]);
                        }
                    } else {
                        func(arr);
                    }
                }

                function getScript(elt) {
                    for (var i = 0; i < SCRIPT_ATTRIBUTES.length; i++) {
                        var scriptAttribute = SCRIPT_ATTRIBUTES[i];
                        if (elt.hasAttribute(scriptAttribute)) {
                            return elt.getAttribute(scriptAttribute)
                        }
                    }
                    return null;
                }

                function applyEventListeners(hypeScript, elt) {
                    forEach(hypeScript.eventListeners, function (eventListener) {
                        eventListener(elt);
                    });
                }

                function setScriptAttrs(values) {
                    SCRIPT_ATTRIBUTES = values;
                }

                function getScriptSelector() {
                    return SCRIPT_ATTRIBUTES.map(function (attribute) {
                        return "[" + attribute + "]";
                    }).join(", ");
                }

                function isType(o, type) {
                    return Object.prototype.toString.call(o) === "[object " + type + "]";
                }

                function evaluate(typeOrSrc, srcOrCtx, ctxArg) {
                    if (isType(srcOrCtx, "Object")) {
                        var src = typeOrSrc;
                        var ctx = srcOrCtx;
                        var type = "expression"
                    } else if (isType(srcOrCtx, "String")) {
                        var src = srcOrCtx;
                        var type = typeOrSrc
                        var ctx = ctxArg;
                    } else {
                        var src = typeOrSrc;
                            var ctx = {};
                        var type = "expression";
                    }
                    ctx = ctx || {};
                    var compiled = _parser.parseElement(type, _lexer.tokenize(src) ).transpile();
                    var evalString = "(function(" + Object.keys(ctx).join(",") + "){return " + compiled + "})";
                    // TODO parser debugging
                    if(false) console.log("transpile: " + compiled);
                    if(false) console.log("evalString: " + evalString);
                    var args = Object.keys(ctx).map(function (key) {
                        return ctx[key]
                    });
                    if(false) console.log("args", args);
                    return eval(evalString).apply(null, args);
                }

                function initElement(elt) {
                    var src = getScript(elt);
                    if (src) {
                        var tokens = _lexer.tokenize(src);
                        var hyperScript = _parser.parseHyperScript(tokens);
                        var transpiled = _parser.transpile(hyperScript);
                        console.log(transpiled);
                        var hyperscriptObj = eval(transpiled);
                        hyperscriptObj.applyEventListenersTo(elt);
                    }
                }

                return {
                    forEach: forEach,
                    triggerEvent: triggerEvent,
                    matchesSelector: matchesSelector,
                    getScript: getScript,
                    applyEventListeners: applyEventListeners,
                    setScriptAttrs: setScriptAttrs,
                    initElement: initElement,
                    evaluate: evaluate,
                    getScriptSelector: getScriptSelector,
                }
            }();

            //-----------------------------------------------
            // Expressions
            //-----------------------------------------------

            _parser.addGrammarElement("string", function (parser, tokens) {
                var stringToken = tokens.matchTokenType('STRING');
                if (stringToken) {
                    return {
                        type: "string",
                        token: stringToken,
                        transpile: function () {
                            if (stringToken.value.indexOf("'") === 0) {
                                return "'" + stringToken.value + "'";
                            } else {
                                return '"' + stringToken.value + '"';
                            }
                        }
                    }
                }
            })

            _parser.addGrammarElement("number", function (parser, tokens) {
                var number = tokens.matchTokenType('NUMBER');
                if (number) {
                    var numberToken = number;
                    var value = parseFloat(number.value)
                    return {
                        type: "number",
                        value: value,
                        numberToken: numberToken,
                        transpile: function () {
                            return numberToken.value;
                        }
                    }
                }
            })

            _parser.addGrammarElement("idRef", function (parser, tokens) {
                var elementId = tokens.matchTokenType('ID_REF');
                if (elementId) {
                    return {
                        type: "idRef",
                        value: elementId.value.substr(1),
                        transpile: function () {
                            return "document.getElementById('" + this.value + "')"
                        }
                    };
                }
            })

            _parser.addGrammarElement("classRef", function (parser, tokens) {
                var classRef = tokens.matchTokenType('CLASS_REF');
                if (classRef) {
                    return {
                        type: "classRef",
                        value: classRef.value,
                        className: function () {
                            return this.value.substr(1);
                        },
                        transpile: function () {
                            return "document.querySelectorAll('" + this.value + "')"
                        }
                    };
                }
            })

            _parser.addGrammarElement("attributeRef", function (parser, tokens) {
                if (tokens.matchOpToken("[")) {
                    var name = tokens.matchTokenType("IDENTIFIER");
                    var value = null;
                    if (tokens.matchOpToken("=")) {
                        value = parser.parseElement("expression", tokens);
                    }
                    tokens.requireOpToken("]");
                    return {
                        type: "attribute_expression",
                        name: name.value,
                        value: value,
                        transpile: function () {
                            if (this.value) {
                                return "({name: '" + this.name + "', value: " + parser.transpile(this.value) + "})";
                            } else {
                                return "({name: '" + this.name + "'})";
                            }
                        }
                    }
                }
            })

            _parser.addGrammarElement("objectLiteral", function (parser, tokens) {
                if (tokens.matchOpToken("{")) {
                    var fields = []
                    if (!tokens.matchOpToken("}")) {
                        do {
                            var name = tokens.requireTokenType("IDENTIFIER");
                            tokens.requireOpToken(":");
                            var value = parser.parseElement("expression", tokens);
                            fields.push({name: name, value: value});
                        } while (tokens.matchOpToken(","))
                        tokens.requireOpToken("}");
                    }
                    return {
                        type: "objectLiteral",
                        fields: fields,
                        transpile: function () {
                            return "({" + fields.map(function (field) {
                                return field.name.value + ":" + parser.transpile(field.value)
                            }).join(", ") + "})";
                        }
                    }
                }


            })

            _parser.addGrammarElement("symbol", function (parser, tokens) {
                var identifier = tokens.matchTokenType('IDENTIFIER');
                if (identifier) {
                    return {
                        type: "symbol",
                        name: identifier.value,
                        transpile: function () {
                            return identifier.value;
                        }
                    };
                }
            });

            _parser.addGrammarElement("implicitMeTarget", function (parser, tokens) {
                return {
                    type: "implicitMeTarget",
                    transpile: function () {
                        return "[me]"
                    }
                };
            });

            _parser.addGrammarElement("implicitAllTarget", function (parser, tokens) {
                return {
                    type: "implicitAllTarget",
                    transpile: function () {
                        return 'document.querySelectorAll("*")';
                    }
                };
            });

            _parser.addGrammarElement("millisecondLiteral", function (parser, tokens) {
                var number = tokens.requireTokenType(tokens, "NUMBER");
                var factor = 1;
                if (tokens.matchToken("s")) {
                    factor = 1000;
                } else if (tokens.matchToken("ms")) {
                    // do nothing
                }
                return {
                    type: "millisecondLiteral",
                    number: number,
                    factor: factor,
                    transpile: function () {
                        return parseFloat(this.number.value);
                    }
                };
            });

            _parser.addGrammarElement("boolean", function (parser, tokens) {
                if (tokens.matchToken("true")) {
                    return {
                        type: "boolean",
                        transpile: function () {
                            return "true";
                        }
                    }
                } else if (tokens.matchToken("false")) {
                    return {
                        type: "boolean",
                        transpile: function () {
                            return "false";
                        }
                    }
                }
            });

            _parser.addGrammarElement("leaf", function (parser, tokens) {
                return parser.parseAnyOf(["boolean", "string", "number", "idRef", "classRef", "symbol", "propertyRef"], tokens)
            });

            _parser.addGrammarElement("propertyAccess", function (parser, tokens, root) {
                if (tokens.matchOpToken(".")) {
                    var prop = tokens.requireTokenType("IDENTIFIER");
                    var propertyAccess = {
                        type: "propertyAccess",
                        root: root,
                        prop: prop,
                        transpile: function () {
                            return parser.transpile(root) + "." + prop.value;
                        }
                    };
                    return _parser.parseElement("indirectExpression", tokens, propertyAccess);
                }
            });

            _parser.addGrammarElement("functionCall", function (parser, tokens, root) {
                if (tokens.matchOpToken("(")) {
                    var args = [];
                    do {
                        args.push(parser.parseElement("expression", tokens));
                    } while (tokens.matchOpToken(","))
                    tokens.requireOpToken(")");
                    var functionCall = {
                        type: "functionCall",
                        root: root,
                        args: args,
                        transpile: function () {
                            return parser.transpile(root) + "(" + args.map(function (arg) {
                                return parser.transpile(arg)
                            }).join(",") + ")"
                        }
                    };
                    return _parser.parseElement("indirectExpression", tokens, functionCall);
                }
            });

            _parser.addGrammarElement("indirectExpression", function (parser, tokens, root) {
                var propAccess = parser.parseElement("propertyAccess", tokens, root);
                if (propAccess) {
                    return propAccess;
                }

                var functionCall = parser.parseElement("functionCall", tokens, root);
                if (functionCall) {
                    return functionCall;
                }

                return root;
            });

            _parser.addGrammarElement("expression", function (parser, tokens) {
                var leaf = _parser.parseElement("leaf", tokens);
                if (leaf) {
                    return _parser.parseElement("indirectExpression", tokens, leaf);
                }
                _parser.raiseParseError(tokens, "Unexpected value: " + tokens.currentToken().value);
            });

            _parser.addGrammarElement("target", function (parser, tokens) {
                var value = parser.parseAnyOf(["symbol", "classRef", "idRef"], tokens);
                if (value == null) {
                    parser.raiseParseError(tokens, "Expected a valid target expression");
                }
                return {
                    type: "target",
                    value: value,
                    transpile: function (context) {
                        if (value.type === "classRef") {
                            return parser.transpile(value);
                        } else if (value.type === "idRef") {
                            return "[" + parser.transpile(value) + "]";
                        } else {
                            return "[" + parser.transpile(value) + "]"; //TODO, check if array?
                        }
                    }
                };
            });

            _parser.addGrammarElement("command", function (parser, tokens) {
                return parser.parseAnyOf(["onCmd", "addCmd", "removeCmd", "toggleCmd", "waitCmd", "sendCmd",
                    "takeCmd", "logCmd", "callCmd", "putCmd", "ifCmd"], tokens);
            })

            _parser.addGrammarElement("commandList", function (parser, tokens) {
                var cmd = parser.parseElement("command", tokens);
                if (cmd) {
                    tokens.matchToken("then");
                    cmd.next = parser.parseElement("commandList", tokens);
                    return cmd;
                }
            })

            _parser.addGrammarElement("hyperscript", function (parser, tokens) {
                var eventListeners = []
                do {
                    eventListeners.push(parser.parseElement("eventListener", tokens));
                } while (tokens.matchToken("end") && tokens.hasMore())
                if (tokens.hasMore()) {
                    parser.raiseParseError(tokens);
                }
                return {
                    type: "hyperscript",
                    eventListeners: eventListeners,
                    transpile: function () {
                        return "(function(){\n" +
                            "var eventListeners = []\n" +
                            eventListeners.map(function (el) {
                                return "eventListeners.push(" + parser.transpile(el) + ");\n"
                            }) +
                            "      function applyEventListenersTo(elt) { _hyperscript.runtime.applyEventListeners(this, elt) }" +
                            "      return {eventListeners:eventListeners, applyEventListenersTo:applyEventListenersTo}\n" +
                            "})()"
                    }
                };
            })


            _parser.addGrammarElement("eventListener", function (parser, tokens) {
                tokens.requireToken("on");
                var on = parser.parseElement("symbol", tokens);
                if (on == null) {
                    parser.raiseParseError(tokens, "Expected event name")
                }
                if (tokens.matchToken("from")) {
                    var from = parser.parseElement("target", tokens);
                    if (from == null) {
                        parser.raiseParseError(tokens, "Expected target value")
                    }
                } else {
                    var from = parser.parseElement("implicitMeTarget", tokens);
                }
                var start = parser.parseElement("commandList", tokens);
                var eventListener = {
                    type: "eventListener",
                    on: on,
                    from: from,
                    start: start,
                    transpile: function () {
                        return "(function(me){" +
                            "var my = me;\n" +
                            "_hyperscript.runtime.forEach( " + parser.transpile(from) + ", function(target){\n" +
                            "  target.addEventListener('" + on.name + "', function(event){\n" +
                            parser.transpile(start) +
                            "  })\n" +
                            "})\n" +
                            "})"
                    }
                };
                return eventListener;
            });

            _parser.addGrammarElement("addCmd", function (parser, tokens) {
                if (tokens.matchToken("add")) {
                    var classRef = parser.parseElement("classRef", tokens);
                    var attributeRef = null;
                    if (classRef == null) {
                        attributeRef = parser.parseElement("attributeRef", tokens);
                        if (attributeRef == null) {
                            parser.raiseParseError(tokens, "Expected either a class reference or attribute expression")
                        }
                    }

                    if (tokens.matchToken("to")) {
                        var to = parser.parseElement("target", tokens);
                    } else {
                        var to = parser.parseElement("implicitMeTarget");
                    }

                    return {
                        type: "addCmd",
                        classRef: classRef,
                        attributeRef: attributeRef,
                        to: to,
                        transpile: function () {
                            if (this.classRef) {
                                return "_hyperscript.runtime.forEach( " + parser.transpile(to) + ", function (target) {" +
                                    "  target.classList.add('" + classRef.className() + "')" +
                                    "})";
                            } else {
                                return "_hyperscript.runtime.forEach( " + parser.transpile(to) + ", function (target) {" +
                                    "  target.setAttribute('" + attributeRef.name + "', " + parser.transpile(attributeRef) + ".value)" +
                                    "})";
                            }
                        }
                    }
                }
            });

            _parser.addGrammarElement("removeCmd", function (parser, tokens) {
                if (tokens.matchToken("remove")) {
                    var classRef = parser.parseElement("classRef", tokens);
                    var attributeRef = null;
                    var elementExpr = null;
                    if (classRef == null) {
                        attributeRef = parser.parseElement("attributeRef", tokens);
                        if (attributeRef == null) {
                            elementExpr = parser.parseElement("expression", tokens)
                            if (elementExpr == null) {
                                parser.raiseParseError(tokens, "Expected either a class reference, attribute expression or value expression");
                            }
                        }
                    }
                    if (tokens.matchToken("from")) {
                        var from = parser.parseElement("target", tokens);
                    } else {
                        var from = parser.parseElement("implicitMeTarget");
                    }

                    return {
                        type: "removeCmd",
                        classRef: classRef,
                        attributeRef: attributeRef,
                        elementExpr: elementExpr,
                        from: from,
                        transpile: function () {
                            if (this.elementExpr) {
                                return "_hyperscript.runtime.forEach( " + parser.transpile(elementExpr) + ", function (target) {" +
                                    "  target.parentElement.removeChild(target)" +
                                    "})";
                            } else {
                                if (this.classRef) {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(from) + ", function (target) {" +
                                        "  target.classList.remove('" + classRef.className() + "')" +
                                        "})";
                                } else {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(from) + ", function (target) {" +
                                        "  target.removeAttribute('" + attributeRef.name + "')" +
                                        "})";
                                }
                            }
                        }
                    }
                }
            });

            _parser.addGrammarElement("toggleCmd", function (parser, tokens) {
                if (tokens.matchToken("toggle")) {
                    var classRef = parser.parseElement("classRef", tokens);
                    var attributeRef = null;
                    if (classRef == null) {
                        attributeRef = parser.parseElement("attributeRef", tokens);
                        if (attributeRef == null) {
                            parser.raiseParseError(tokens, "Expected either a class reference or attribute expression")
                        }
                    }
                    if (tokens.matchToken("on")) {
                        var on = parser.parseElement("target", tokens);
                    } else {
                        var on = parser.parseElement("implicitMeTarget");
                    }
                    return {
                        type: "toggleCmd",
                        classRef: classRef,
                        attributeRef: attributeRef,
                        on: on,
                        transpile: function () {
                            if (this.classRef) {
                                return "_hyperscript.runtime.forEach( " + parser.transpile(on) + ", function (target) {" +
                                    "  target.classList.toggle('" + classRef.className() + "')" +
                                    "})";
                            } else {
                                return "_hyperscript.runtime.forEach( " + parser.transpile(on) + ", function (target) {" +
                                    "  if(target.hasAttribute('" + attributeRef.name + "')) {\n" +
                                    "    target.removeAttribute('" + attributeRef.name + "');\n" +
                                    "  } else { \n" +
                                    "    target.setAttribute('" + attributeRef.name + "', " + parser.transpile(attributeRef) + ".value)" +
                                    "  }" +
                                    "})";
                            }
                        }
                    }
                }
            })

            _parser.addGrammarElement("waitCmd", function (parser, tokens) {
                if (tokens.matchToken("wait")) {
                    var time = parser.parseElement('millisecondLiteral', tokens);
                    return {
                        type: "waitCmd",
                        time: time,
                        transpile: function () {
                            var capturedNext = this.next;
                            delete this.next;
                            return "setTimeout(function () { " + parser.transpile(capturedNext) + " }, " + parser.transpile(this.time) + ")";
                        }
                    }
                }
            })

            _parser.addGrammarElement("sendCmd", function (parser, tokens) {
                if (tokens.matchToken("send")) {
                    var eventName = tokens.requireTokenType(tokens, "IDENTIFIER");
                    var details = parser.parseElement("objectLiteral", tokens);
                    if (tokens.matchToken("to")) {
                        var to = parser.parseElement("target", tokens);
                    } else {
                        var to = parser.parseElement("implicitMeTarget");
                    }

                    return {
                        type: "sendCmd",
                        eventName: eventName,
                        details: details,
                        to: to,
                        transpile: function () {
                            return "_hyperscript.runtime.forEach( " + parser.transpile(to) + ", function (target) {" +
                                "  _hyperscript.runtime.triggerEvent(target, '" + eventName.value + "'," + parser.transpile(details, "{}") + ")" +
                                "})";
                        }
                    }
                }
            })

            _parser.addGrammarElement("takeCmd", function (parser, tokens) {
                if (tokens.matchToken("take")) {
                    var classRef = tokens.requireTokenType(tokens, "CLASS_REF");

                    if (tokens.matchToken("from")) {
                        var from = parser.parseElement("target", tokens);
                    } else {
                        var from = parser.parseElement("implicitAllTarget")
                    }
                    return {
                        type: "takeCmd",
                        classRef: classRef,
                        from: from,
                        transpile: function () {
                            var clazz = this.classRef.value.substr(1);
                            return "  _hyperscript.runtime.forEach(" + parser.transpile(from) + ", function (target) { target.classList.remove('" + clazz + "') }); " +
                                "me.classList.add('" + clazz + "');";
                        }
                    }
                }
            })

            _parser.addGrammarElement("logCmd", function (parser, tokens) {
                if (tokens.matchToken("log")) {
                    var exprs = [parser.parseElement("expression", tokens)];
                    while (tokens.matchOpToken(",")) {
                        exprs.push(parser.parseElement("expression", tokens));
                    }
                    if (tokens.matchToken("with")) {
                        var withExpr = parser.parseElement("expression", tokens);
                    }
                    return {
                        type: "logCmd",
                        exprs: exprs,
                        withExpr: withExpr,
                        transpile: function () {
                            if (withExpr) {
                                return parser.transpile(withExpr) + "(" + exprs.map(function (expr) {
                                    return parser.transpile(expr)
                                }).join(", ") + ")";
                            } else {
                                return "console.log(" + exprs.map(function (expr) {
                                    return parser.transpile(expr)
                                }).join(", ") + ")";
                            }
                        }
                    };
                }
            })

            _parser.addGrammarElement("callCmd", function (parser, tokens) {
                if (tokens.matchToken("call")) {
                    return {
                        type: "callCmd",
                        expr: parser.parseElement("expression", tokens),
                        transpile: function () {
                            return "var it = " + parser.transpile(this.expr);
                        }
                    }
                }
            })

            _parser.addGrammarElement("putCmd", function (parser, tokens) {
                if (tokens.matchToken("put")) {

                    var value = parser.parseElement("expression", tokens);

                    var operation = tokens.matchToken("into") ||
                        tokens.matchToken("before") ||
                        tokens.matchToken("afterbegin") ||
                        tokens.matchToken("beforeend") ||
                        tokens.matchToken("after");

                    if (operation == null) {
                        parser.raiseParseError(tokens, "Expected one of 'into', 'before', 'afterbegin', 'beforeend', 'after'")
                    }
                    var target = parser.parseElement("target", tokens);
                    var propPath = []
                    while (tokens.matchOpToken(".")) {
                        propPath.push(tokens.requireTokenType("IDENTIFIER").value)
                    }

                    var directWrite = propPath.length === 0 && operation.value === "into";
                    var symbolWrite = directWrite && target.value.type === "symbol";
                    if (directWrite && !symbolWrite) {
                        parser.raiseParseError(tokens, "Can only put directly into symbols, not references")
                    }

                    return {
                        type: "putCmd",
                        target: target,
                        propPath: propPath,
                        op: operation.value,
                        symbolWrite: symbolWrite,
                        value: value,
                        transpile: function () {
                            if (this.symbolWrite) {
                                return "var " + target.value.name + " = " + parser.transpile(value);
                            } else {
                                var dotPath = propPath.length === 0 ? "" : "." + propPath.join(".");
                                if (this.op === "into") {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(target) + ", function (target) {" +
                                        "  target" + dotPath + "=" + parser.transpile(value) +
                                        "})";
                                } else if (this.op === "before") {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(target) + ", function (target) {" +
                                        "  target" + dotPath + ".insertAdjacentHTML('beforebegin', " + parser.transpile(value) + ")" +
                                        "})";
                                } else if (this.op === "afterbegin") {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(target) + ", function (target) {" +
                                        "  target" + dotPath + ".insertAdjacentHTML('afterbegin', " + parser.transpile(value) + ")" +
                                        "})";
                                } else if (this.op === "beforeend") {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(target) + ", function (target) {" +
                                        "  target" + dotPath + ".insertAdjacentHTML('beforeend', " + parser.transpile(value) + ")" +
                                        "})";
                                } else if (this.op === "after") {
                                    return "_hyperscript.runtime.forEach( " + parser.transpile(target) + ", function (target) {" +
                                        "  target" + dotPath + ".insertAdjacentHTML('afterend', " + parser.transpile(value) + ")" +
                                        "})";
                                }
                            }
                        }
                    }
                }
            })

            _parser.addGrammarElement("ifCmd", function (parser, tokens) {
                if (tokens.matchToken("if")) {
                    var expr = parser.parseElement("expression", tokens);
                    var trueBranch = parser.parseElement("commandList", tokens);
                    if (tokens.matchToken("else")) {
                        var falseBranch = parser.parseElement("commandList", tokens);
                    }
                    if (tokens.hasMore()) {
                        tokens.requireToken("end");
                    }
                    return {
                        type: "ifCmd",
                        expr: expr,
                        trueBranch: trueBranch,
                        falseBranch: falseBranch,
                        transpile: function () {
                            return "if(" + parser.transpile(expr) + "){" + "" + parser.transpile(trueBranch) + "}" +
                                "   else {" + parser.transpile(falseBranch, "") + "}"

                        }
                    }
                }
            })

            //-----------------------------------------------
            // API
            //-----------------------------------------------

            function start(scriptAttrs) {
                if (scriptAttrs) {
                    _runtime.setScriptAttrs(scriptAttrs);
                }
                var fn = function () {
                    var elements = document.querySelectorAll(_runtime.getScriptSelector());
                    _runtime.forEach(elements, function (elt) {
                        init(elt);
                    })
                };
                if (document.readyState !== 'loading') {
                    fn();
                } else {
                    document.addEventListener('DOMContentLoaded', fn);
                }
                return true;
            }

            function init(elt) {
                _runtime.initElement(elt);
            }

            function evaluate(str) {
                return _runtime.evaluate(str);
            }

            return {
                lexer: _lexer,
                parser: _parser,
                runtime: _runtime,
                evaluate: evaluate,
                init: init,
                start: start
            }
        }
    )()
}));