/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var vscode_debugadapter_1 = require('vscode-debugadapter');
//var handles_1 = require('./common/handles');
var fs_1 = require('fs');
var path_1 = require('path');
// var vscode = require('vscode');
var DebuggerHost = require('./node_modules/node-perl-debugger/src/index.js').DebuggerHost;
  
var PerlDebugSession = (function (_super) {
    __extends(PerlDebugSession, _super);
    function PerlDebugSession(debuggerLinesStartAt1, isServer) {
        if (isServer === void 0) { isServer = false; }
        _super.call(this, debuggerLinesStartAt1, isServer);
        this._sourceFile = null;
        this._sourceLines = [];
        this._currentLine = 0;
        this._breakPoints = {};
        this._variableHandles = new vscode_debugadapter_1.Handles();
        
        this.isReady = false;
        this.debug = new DebuggerHost({
            log: process.stdout,
            port: 12345
        });
        this.debug.on("disconnection", function() {
            this.debug.close();
        });
        
        this.debug.on("close", function() {
            this.trace("Finished");
        });//*/
        
        
        
    }
    Object.defineProperty(PerlDebugSession.prototype, "_currentLine", {
        get: function () {
            return this.__currentLine;
        },
        set: function (line) {
            this.__currentLine = line;
            this.sendEvent(new vscode_debugadapter_1.OutputEvent("line: " + line + "\n")); // print current line on debug console
        },
        enumerable: true,
        configurable: true
    });
    PerlDebugSession.prototype.initializeRequest = function (response, args) {
        this.sendResponse(response);
        // now we are ready to accept breakpoints -> fire the initialized event to give UI a chance to set breakpoints
        this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
        this.debug.listen();
        
    };
    PerlDebugSession.prototype.launchRequest = function (response, args) {
        this._sourceFile = args.program;
        this._sourceLines = fs_1.readFileSync(this._sourceFile).toString().split('\n');
        if (args.stopOnEntry) {
            this._currentLine = 0;
            this.sendResponse(response);
            // we stop on the first line
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent("entry", PerlDebugSession.THREAD_ID));
        }
        else {
            // we just start to run until we hit a breakpoint or an exception
            this.continueRequest(response, { threadId: PerlDebugSession.THREAD_ID });
        }
        
    };
    PerlDebugSession.prototype.setBreakPointsRequest = function (response, args) {
        var path = args.source.path;
        var clientLines = args.lines;
        // read file contents into array for direct access
        var lines = fs_1.readFileSync(path).toString().split('\n');
        var newPositions = [clientLines.length];
        var breakpoints = [];
        // verify breakpoint locations
        for (var i = 0; i < clientLines.length; i++) {
            var l = this.convertClientLineToDebugger(clientLines[i]);
            var verified = false;
            if (l < lines.length) {
                // if a line starts with '+' we don't allow to set a breakpoint but move the breakpoint down
                if (lines[l].indexOf("+") == 0)
                    l++;
                // if a line starts with '-' we don't allow to set a breakpoint but move the breakpoint up
                if (lines[l].indexOf("-") == 0)
                    l--;
                verified = true; // this breakpoint has been validated
            }
            newPositions[i] = l;
            breakpoints.push({ verified: verified, line: this.convertDebuggerLineToClient(l) });
        }
        this._breakPoints[path] = newPositions;
        // send back the actual breakpoints
        response.body = {
            breakpoints: breakpoints
        };
        this.sendResponse(response);
    };
    PerlDebugSession.prototype.threadsRequest = function (response) {
        // return the default thread
        response.body = {
            threads: [
                new vscode_debugadapter_1.Thread(PerlDebugSession.THREAD_ID, "thread 1")
            ]
        };
        this.sendResponse(response);
    };
    PerlDebugSession.prototype.stackTraceRequest = function (response, args) {
        var frames = new Array();
        var words = this._sourceLines[this._currentLine].trim().split(/\s+/);
        // create three fake stack frames.
        for (var i = 0; i < 3; i++) {
            // use a word of the line as the stackframe name
            var name_1 = words.length > i ? words[i] : "frame";
            frames.push(new vscode_debugadapter_1.StackFrame(i, name_1 + "(" + i + ")", new vscode_debugadapter_1.Source(path_1.basename(this._sourceFile), this.convertDebuggerPathToClient(this._sourceFile)), this.convertDebuggerLineToClient(this._currentLine), 0));
        }
        response.body = {
            stackFrames: frames
        };
        this.trace(response);
        this.debug.on("ready", function(){this.sendResponse(this._commandPD.stacktrace())});    
        
        //this.sendResponse(response);
        
    };
    PerlDebugSession.prototype.scopesRequest = function (response, args) {
        var frameReference = args.frameId;
        var scopes = new Array();
        scopes.push(new vscode_debugadapter_1.Scope("Local", this._variableHandles.create("local_" + frameReference), false));
        scopes.push(new vscode_debugadapter_1.Scope("Closure", this._variableHandles.create("closure_" + frameReference), false));
        scopes.push(new vscode_debugadapter_1.Scope("Global", this._variableHandles.create("global_" + frameReference), true));
        response.body = {
            scopes: scopes
        };
        this.sendResponse(response);
    };
    PerlDebugSession.prototype.variablesRequest = function (response, args) {
        var variables = [];
        var id = this._variableHandles.get(args.variablesReference);
        if (id != null) {
            variables.push({
                name: id + "_i",
                value: "123",
                variablesReference: 0
            });
            variables.push({
                name: id + "_f",
                value: "3.14",
                variablesReference: 0
            });
            variables.push({
                name: id + "_s",
                value: "Hola diego",
                variablesReference: 0
            });
            variables.push({
                name: id + "_o",
                value: "Object",
                variablesReference: this._variableHandles.create("object_")
            });
        }
        response.body = {
            variables: variables
        };
        //this.trace(this._commandPD.variables());
        this.sendResponse(response);
        
    };
    PerlDebugSession.prototype.continueRequest = function (response, args) {
        this.trace("Hello World!!!!");
        var lines = this._breakPoints[this._sourceFile];
        for (var ln = this._currentLine + 1; ln < this._sourceLines.length; ln++) {
            // is breakpoint on this line?
            if (lines && lines.indexOf(ln) >= 0) {
                this._currentLine = ln;
                this.sendResponse(response);
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent("step", PerlDebugSession.THREAD_ID));
                return;
            }
            // if word 'exception' found in source -> throw exception
            if (this._sourceLines[ln].indexOf("exception") >= 0) {
                this._currentLine = ln;
                this.sendResponse(response);
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent("exception", PerlDebugSession.THREAD_ID));
                this.sendEvent(new vscode_debugadapter_1.OutputEvent("exception in line: " + ln + "\n", 'stderr'));
                return;
            }
        }
        this.sendResponse(response);
        //this.trace(this._commandPD.continue());
        // no more lines: run to end
        this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
    };
    PerlDebugSession.prototype.nextRequest = function (response, args) {
        
        for (var ln = this._currentLine + 1; ln < this._sourceLines.length; ln++) {
            if (this._sourceLines[ln].trim().length > 0) {
                this._currentLine = ln;
                this.sendResponse(response);
                this.sendEvent(new vscode_debugadapter_1.StoppedEvent("step", PerlDebugSession.THREAD_ID));
                return;
            }
        }
        this.sendResponse(response);
        // no more lines: run to end
        this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
    };
    PerlDebugSession.prototype.evaluateRequest = function (response, args) {
        response.body = {
            result: "evaluate(" + args.expression + ")",
            variablesReference: 0
        };
        this.sendResponse(response);
    };
    PerlDebugSession.prototype.trace = function(valueToSendConsole){
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(valueToSendConsole));
    };
    // we don't support multiple threads, so we can use a hardcoded ID for the default thread
    PerlDebugSession.THREAD_ID = 1;
    return PerlDebugSession;
})(vscode_debugadapter_1.DebugSession);
vscode_debugadapter_1.DebugSession.run(PerlDebugSession);
//# sourceMappingURL=mockDebug.js.map