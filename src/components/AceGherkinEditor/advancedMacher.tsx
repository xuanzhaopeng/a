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

const STEP_DEF_PLACEHOLDER = '##';
export const FULL_MATCH = 2;
export const PARTIAL_MATCH = 1;
export const NO_MATCH = 0;

interface CompiledStepDef {
    stepWithoutOptionBlock: string,
    stepPlaceHolder: string
}

interface CompiledStep {
    step: string,
    stepWithoutOptionBlock: string,
    stepPlaceHolder: string,
    optionBlocks: string[]
}

interface MatchResult {
    matchedType: number,
    params: any[] | null
}

interface Suggest {
    suggestStr: string,
    replaceStr: string
}

interface StepParam {
    parameStr: string,
    paramStartIndex: number
}

function isNullOrWhitespace(input: string) {
    return !input || !input.trim();
}

export function retriveOptionalBlocks(stepDef: string): string[] {
    var regex = /\((([^()]*\([^)]+\)[^)?]*)|([^()?]))+\)\?/g;
    var optionBlocks = stepDef.match(regex);
    return optionBlocks ? optionBlocks.map(s => s.substring(1, s.length - 2)) : [];
}

export function getCompiledStepDef(stepDef: string, optionBlcoks: string[]): CompiledStepDef {

    var stepDefWithoutOB = stepDef;
    var stepDefPlaceHolder = stepDef;
    for (var i = 0; i < optionBlcoks.length; i++) {
        stepDefWithoutOB = stepDefWithoutOB.replace(`(${optionBlcoks[i]})?`, '');
        stepDefPlaceHolder = stepDefPlaceHolder.replace(`(${optionBlcoks[i]})?`, `${STEP_DEF_PLACEHOLDER}${i + 1}`);
    }
    return {
        stepWithoutOptionBlock: stepDefWithoutOB,
        stepPlaceHolder: stepDefPlaceHolder
    };
}

export function compileStepDef(stepDef: string): CompiledStep {
    var optionBlocks = retriveOptionalBlocks(stepDef);
    var compiledStepDef = getCompiledStepDef(stepDef, optionBlocks);
    return {
        step: stepDef,
        stepWithoutOptionBlock: compiledStepDef.stepWithoutOptionBlock,
        stepPlaceHolder: compiledStepDef.stepPlaceHolder,
        optionBlocks: optionBlocks
    }
}

export function getStepMatchResult(regexStr: string, text: string): MatchResult {
    var regex = new RegExp(regexStr);
    var partialMatchRegex = regex.toPartialMatchRegex();
    var partialResult = partialMatchRegex.exec(text);
    var fullResult = regex.exec(text);
    if (fullResult) {
        return {
            matchedType: FULL_MATCH,
            params: null
        };
    } else if (partialResult && partialResult[0]) {
        return {
            matchedType: PARTIAL_MATCH,
            params: partialResult.length > 1 ? partialResult.slice(1) : null
        }
    } else {
        return {
            matchedType: NO_MATCH,
            params: null
        }
    }
}

export function getStepParms(step: string): StepParam[] {
    var params:StepParam[] = [];
    step.replace(/(\([^(]*\))([^?]|)/g, function (matched:string, group1:string, group2:string, index:number) {
        params.push({
            parameStr: group1,
            paramStartIndex: index
        });
        return '';
    });
    return params;
}

export function completeStepWithGivenValue(step: string, params: any[] | null): string {
    if(!params) {
        return step;
    }
    var originalParams = getStepParms(step);

    for(var i = 0; i < params.length; i++) {
        var originalParam = originalParams[i];
        var givenParam = params[i];
        var stepPart1 = step.substring(0, originalParam.paramStartIndex + originalParam.parameStr.length);
        var stepPart2 = step.substring(originalParam.paramStartIndex + originalParam.parameStr.length, step.length);

        for(var j = 1; j <= givenParam.length; j++) {
            var paramPart1 = givenParam.substring(0, j);
            var paramPart2 = givenParam.substring(j, givenParam.length);

            var firstPart = stepPart1.replace(originalParam.parameStr, paramPart1);

            var checkFirstPart = getStepMatchResult(stepPart1, firstPart);
            var checkSecondPart = getStepMatchResult(stepPart2, paramPart2);
            if(checkFirstPart.matchedType != NO_MATCH && checkSecondPart.matchedType != NO_MATCH) {
                params[i] = paramPart1;
                if(checkSecondPart.params) {
                    for(var _ii = 0; _ii < checkSecondPart.params.length; _ii++) {
                        if(checkSecondPart.params[_ii] && !isNullOrWhitespace(checkSecondPart.params[_ii])) {
                            params[i + _ii + 1] = checkSecondPart.params[_ii];
                        }
                    }
                }
                break;
            }
        }
    }

    params.forEach(param => {
        if (param && !isNullOrWhitespace(param)) {
            step = step.replace(/(\([^(]*\))([^?])/, function (matched, ...args: any[]) {
                return `${param}${args[1]}`;
            });
        }
    })

    return step;
}

export function getStepSuggest(compiledStep: CompiledStep, text: string): Suggest | null {
    var currentStep = compiledStep.stepWithoutOptionBlock;
    var initMatchResult = getStepMatchResult('^' + compiledStep.stepWithoutOptionBlock + '$', text);
    console.log(currentStep);

    if (initMatchResult.matchedType == PARTIAL_MATCH) {
        console.log(initMatchResult.params);
        if (initMatchResult.params) {
            initMatchResult.params.forEach(param => {
                if (param && !isNullOrWhitespace(param)) {
                    currentStep = currentStep.replace(/(\([^(]*\))([^?])/, function (matched, ...args: any[]) {
                        return `${param}${args[1]}`;
                    });
                }
            })
        }
        return {
            suggestStr: compiledStep.step,
            replaceStr: currentStep
        };
    } else if (initMatchResult.matchedType == NO_MATCH) {
        var isMatched = false;
        for (var i = 0; i < compiledStep.optionBlocks.length; i++) {
            var step = compiledStep.stepPlaceHolder.replace(`${STEP_DEF_PLACEHOLDER}${i + 1}`, compiledStep.optionBlocks[i]);
            console.log(step);
            initMatchResult = getStepMatchResult('^' + step + '$', text);
            if (initMatchResult.matchedType == PARTIAL_MATCH) {
                console.log(initMatchResult.params);
                isMatched = true;
                currentStep = step;
                break;
            }
        }

        if (isMatched) {
            if (initMatchResult.params) {
                initMatchResult.params.forEach(param => {
                    if (param && !isNullOrWhitespace(param)) {
                        currentStep = currentStep.replace(/(\([^(]*\))([^?])/, function (matched, ...args: any[]) {
                            return `${param}${args[1]}`;
                        });
                    }
                })
            }
            return {
                suggestStr: compiledStep.step,
                replaceStr: currentStep
            };
        } else {
            // it means there is no way to match the text
            return null;
        }


    } else {
        // if full match already ,do not return any suggest back
        return null;
    }

}

export function isMatch(compliedStepList: CompiledStep[], text: string) {
    compliedStepList.forEach(compiledStep => {
        var stepDisplay = compiledStep.step;
        compiledStep.step = compiledStep.step.replace(/\?\:/, "");


    });
}

export default function match(stepDefs: any, text: string) {

}