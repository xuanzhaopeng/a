var listener = {
    comment: function (value: string, line: number) {
    },
    tag: function (value: string, line: number) {
    },
    feature: function (keyword: string, name: string, description: string, line: number) {
    },
    background: function (keyword: string, name: string, description: string, line: number) {
    },
    scenario: function (keyword: string, name: string, description: string, line: number) {
    },
    step: function (keyword: string, name: string, line: number, err: any) {
    },
    scenario_outline: function (keyword: string, name: string, description: string, line: number) {
    },
    examples: function (keyword: string, name: string, description: string, line: number) {
    },
    py_string: function (string: string, line: string) {
    },
    row: function (row: any, line: number) {
    },
    eof: function () {
    }
};
var Lexer: any = require("gherkin/lib/gherkin/lexer/en");
var lex = new Lexer(listener);

export function Lexering(source:string, stepCallback: (keyword:string|null, name:string|null, line:number, err:any) => void) {
    try {
        listener.step = stepCallback;
        lex.scan(source);
      } catch(exception) {
        var line = exception.match(/Lexing error on line (\d+):/)[1];
        stepCallback(null, null, line, true);
      }
}