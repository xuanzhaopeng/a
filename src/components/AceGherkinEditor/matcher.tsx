RegExp.prototype.toPartialMatchRegex = function () {
    "use strict";

    var re = this,
        source = this.source,
        i = 0;

    function process() {
        var result = "",
            tmp;

        function appendRaw(nbChars: number) {
            result += source.substr(i, nbChars);
            i += nbChars;
        };

        function appendOptional(nbChars: number) {
            result += "(?:" + source.substr(i, nbChars) + "|$)";
            i += nbChars;
        };

        while (i < source.length) {
            switch (source[i]) {
                case "\\":
                    switch (source[i + 1]) {
                        case "c":
                            appendOptional(3);
                            break;

                        case "x":
                            appendOptional(4);
                            break;

                        case "u":
                            if (re.unicode) {
                                if (source[i + 2] === "{") {
                                    appendOptional(source.indexOf("}", i) - i + 1);
                                } else {
                                    appendOptional(6);
                                }
                            } else {
                                appendOptional(2);
                            }
                            break;

                        default:
                            appendOptional(2);
                            break;
                    }
                    break;

                case "[":
                    tmp = /\[(?:\\.|.)*?\]/g;
                    tmp.lastIndex = i;
                    tmp = tmp.exec(source);
                    appendOptional(tmp![0].length);
                    break;

                case "|":
                case "^":
                case "$":
                case "*":
                case "+":
                case "?":
                    appendRaw(1);
                    break;

                case "{":
                    tmp = /\{\d+,?\d*\}/g;
                    tmp.lastIndex = i;
                    tmp = tmp.exec(source);
                    if (tmp) {
                        appendRaw(tmp[0].length);
                    } else {
                        appendOptional(1);
                    }
                    break;

                case "(":
                    if (source[i + 1] == "?") {
                        switch (source[i + 2]) {
                            case ":":
                                result += "(?:";
                                i += 3;
                                result += process() + "|$)";
                                break;

                            case "=":
                                result += "(?=";
                                i += 3;
                                result += process() + ")";
                                break;

                            case "!":
                                tmp = i;
                                i += 3;
                                process();
                                result += source.substr(tmp, i - tmp);
                                break;
                        }
                    } else {
                        appendRaw(1);
                        result += process() + "|$)";
                    }
                    break;

                case ")":
                    ++i;
                    return result;

                default:
                    appendOptional(1);
                    break;
            }
        }

        return result;
    }

    return new RegExp(process(), this.flags);
};

interface MatchResult {
    suggest: string,
    replaceStr: string
}

interface IsMatchResult {
    matchedType: number,
    groups:any[] | null
}

interface ParmaRegexResult {
    value: string,
    params: string[],
    optionBlocks: string[]
}

function paramRegexp(regexpStr: string) : ParmaRegexResult {
    // replace all (...) to {param}, exclude the state like (...)?
    var params: string[] = [];
    var optionBlocks: string[] = [];

    // retrive all (...)? and put the inner content to optionBlocks
    var matches = regexpStr.match(/\(((?!\?).)+\)\?/g);
    if(matches) {
        for(var _i = 0; _i < matches.length; _i++) {
            optionBlocks.push(matches[_i].substring(1, matches[_i].length - 2));
        }
    }
    
    var paramedRegexp = regexpStr.replace(/(\([^(]*\))([^?])/g, function(matched, ...args: any[]) {
        var replacement = args[0].replace(/[()]/g, '');
        var $2 = args[1];
        params.push(replacement);
        return "{param}" + $2;
    });

    
    // remove $ and ^ from regexp str
    paramedRegexp = paramedRegexp.replace(/[\^\$]|\\\w/g, "");

    return {
        value: paramedRegexp,
        params: params,
        optionBlocks: optionBlocks
    };
}

function isMatch(regexStr: string, text: string): IsMatchResult {
    var regex = new RegExp(regexStr);
    var partialMatchRegex = regex.toPartialMatchRegex();
    var partialResult = partialMatchRegex.exec(text);
    var fullResult = regex.exec(text);
    if(fullResult) {
        return {
            matchedType: 2,
            groups: null
        };
    } else if(partialResult && partialResult[0]) {
        return {
            matchedType: 1,
            groups: partialResult.length > 1 ? partialResult.slice(1) : null
        }
    } else {
        return {
            matchedType: 0,
            groups: null
        }
    }
}

export function matches(stepDefs: any, text: string):MatchResult[] {
    var result = [];
    for (var stepdef in stepDefs) {
        // remove something like ?: from (?:...)
        var originalStepDef = stepdef;
        stepdef = stepdef.replace(/\?\:/, "");

        console.log('--------------');
        var isMatchResult = isMatch(stepdef, text);
        if (isMatchResult.matchedType == 1) {
            var paramRgexpValue = paramRegexp(stepdef);

            console.log(JSON.stringify(paramRgexpValue));

            if(isMatchResult.groups) {
                console.log(isMatchResult.groups);
                console.log("init: " + paramRgexpValue.value);
                if (isMatchResult.groups.length > paramRgexpValue.params.length) {
                    // it means the regex str contains state (...)?
                    var countOfUndefined = 0;
                    var countOfParamReplace = 0;
                    isMatchResult.groups.forEach(_match => {
                        if(_match == undefined) {
                            countOfUndefined++;
                        } else {
                            if((_match == '' || _match == ' ') && countOfParamReplace < paramRgexpValue.params.length )  {
                                // when match value is empty, it will set param regex value
                                paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, paramRgexpValue.params[countOfParamReplace]);
                                countOfParamReplace++;
                            } else {
                                // when it is non empy value
                                var isOptionBlock = false;
                                for(var _i = 0; _i< paramRgexpValue.optionBlocks.length; _i++) {
                                    console.log("check option: " + paramRgexpValue.optionBlocks[_i] + "|-|" + _match);
                                    if(isMatch(paramRgexpValue.optionBlocks[_i], _match).matchedType > 0) {
                                        isOptionBlock = true;
                                        break;
                                    }
                                }

                                if(!isOptionBlock) {
                                    console.log("Not option block")
                                    paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, _match);
                                    countOfParamReplace++;
                                } else {
                                    console.log("IS Option block");
                                    paramRgexpValue.value = paramRgexpValue.value.replace(/\(/, "").replace(/\)\?/, '');
                                }
                            }
                        }
                    });

                    console.log("====state=====")
                    console.log(countOfParamReplace);
                    console.log(countOfUndefined);

                    if(countOfParamReplace == paramRgexpValue.params.length && countOfUndefined > 0) {
                        // fill up all params, but still have (...)?
                        paramRgexpValue.value = paramRgexpValue.value.replace(/\([^(]*\)\?/g, '');
                    } else if(countOfParamReplace < paramRgexpValue.params.length && countOfUndefined > 0) {
                        for(var i = countOfParamReplace; i< paramRgexpValue.params.length; i++) {
                            paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, paramRgexpValue.params[i]);
                        }
                        paramRgexpValue.value = paramRgexpValue.value.replace(/\([^(]*\)\?/g, '');
                    }  else if (countOfParamReplace >= paramRgexpValue.params.length && countOfUndefined == 0) {
                        paramRgexpValue.value = paramRgexpValue.value.replace(/\(/, "").replace(/\)\?/, '');
                    }
                } else {
                    // it means the regex str DOES NOT contains (...)?
                    var countOfParamReplace = 0;
                    isMatchResult.groups.forEach(_match => {
                        if(_match == '' || _match == ' ') {
                            paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, paramRgexpValue.params[countOfParamReplace]);
                            countOfParamReplace++;
                        } else {
                            var _param = paramRgexpValue.params[countOfParamReplace];
                            if(_param.split('|').length > 0) {
                                var choices = _param.split('|');
                                var found = false;
                                for(var _i = 0; _i < choices.length; _i++) {
                                    if(choices[_i].startsWith(_match)) {
                                        paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, choices[_i]);
                                        found = true;
                                        break;
                                    }
                                }
                                if(!found) {
                                    paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, _match);
                                }
                                countOfParamReplace++;
                            } else {
                                paramRgexpValue.value = paramRgexpValue.value.replace(/{param}/, _match);
                                countOfParamReplace++;
                            }
                        }
                    });
                }
            }
            //paramRgexpValue.value = paramRgexpValue.value.replace(/\(.*\)\?/g, '');
            console.log("final:" + paramRgexpValue.value);

            result.push({
                suggest: originalStepDef,
                replaceStr: paramRgexpValue.value
            });
        }
        /*
        var examples = stepDefs[stepdef];
        for (var n in examples) {
            var example = examples[n];
            if (example.indexOf(text) != -1) {
                result.push({
                    suggest: example,
                    replaceStr: example
                });
            }
        }
        */
    }
    return result;
}