import { retriveOptionalBlocks, getCompiledStepDef, getStepMatchResult, getStepSuggest, compileStepDef, getStepParms, completeStepWithGivenValue,  FULL_MATCH, PARTIAL_MATCH, NO_MATCH } from './advancedMacher';

it('retrive option blocks', () => {
    var r1 = retriveOptionalBlocks("I op1( with test1)?");
    expect(r1).toEqual([" with test1"]);

    var r2 = retriveOptionalBlocks("I op1( with test1)?( with test2)?");
    expect(r2).toEqual([" with test1", " with test2"]);

    var r3 = retriveOptionalBlocks("(start with )? I do test( with qa)?");
    expect(r3).toEqual(["start with ", " with qa"]);

    var r4 = retriveOptionalBlocks("I have test?");
    expect(r4).toEqual([]);

    var r5 = retriveOptionalBlocks("I have (.*) tests? and bad (.*)");
    expect(r5).toEqual([]);

    var r6 = retriveOptionalBlocks('I set username "abc"(with "(.*)")?');
    expect(r6).toEqual(['with "(.*)"']);
        
    var r7 = retriveOptionalBlocks('I op1 (\\d+)( with ok)? (.*)');
    expect(r7).toEqual([' with ok']);
});

it('get compiled step def', () => {
    
    var stepDef = 'I op1( with test1)?';
    var optionBlocks = retriveOptionalBlocks(stepDef);
    var compiledStep = getCompiledStepDef(stepDef, optionBlocks);
    expect(compiledStep.stepWithoutOptionBlock).toEqual('I op1');
    expect(compiledStep.stepPlaceHolder).toEqual('I op1##1');

    stepDef = 'I op1( with test1 (\\d+))? done( no problem (.*))?';
    optionBlocks = retriveOptionalBlocks(stepDef);
    compiledStep = getCompiledStepDef(stepDef, optionBlocks);
    expect(compiledStep.stepWithoutOptionBlock).toEqual('I op1 done');
    expect(compiledStep.stepPlaceHolder).toEqual('I op1##1 done##2');

    var stepDef = 'I op1 (\\d+)( with ok)? (.*)';
    var optionBlocks = retriveOptionalBlocks(stepDef);
    var compiledStep = getCompiledStepDef(stepDef, optionBlocks);
    expect(compiledStep.stepWithoutOptionBlock).toEqual('I op1 (\\d+) (.*)');
    expect(compiledStep.stepPlaceHolder).toEqual('I op1 (\\d+)##1 (.*)');
});

it('get step match result', () => {
    var regexStr = 'I have (\\d+) cookies';
    var result = getStepMatchResult(regexStr, 'I');
    expect(result.matchedType).toEqual(PARTIAL_MATCH);
    expect(result.params).toEqual([""]);

    result = getStepMatchResult(regexStr, 'I ');
    expect(result.matchedType).toEqual(PARTIAL_MATCH);
    expect(result.params).toEqual([""]);

    result = getStepMatchResult(regexStr, 'I have 3');
    expect(result.matchedType).toEqual(PARTIAL_MATCH);
    expect(result.params).toEqual(["3"]);

    result = getStepMatchResult(regexStr, 'I have 3 cookies');
    expect(result.matchedType).toEqual(FULL_MATCH);
    expect(result.params).toEqual(null);

    result = getStepMatchResult(regexStr, 'I have a');
    expect(result.matchedType).toEqual(NO_MATCH);
    expect(result.params).toEqual(null);

    regexStr = 'I have (\\d+) cookies with (.*) name';
    result = getStepMatchResult(regexStr, 'I have ');
    expect(result.matchedType).toEqual(PARTIAL_MATCH);
    expect(result.params).toEqual(["", ""]);

    result = getStepMatchResult(regexStr, 'I have 3');
    expect(result.matchedType).toEqual(PARTIAL_MATCH);
    expect(result.params).toEqual(["3", ""]);

    result = getStepMatchResult(regexStr, 'I have 3 cookies with hello');
    expect(result.matchedType).toEqual(PARTIAL_MATCH);
    expect(result.params).toEqual(["3", "hello"]);
});

it("get step params", () => {
    var stepParams = getStepParms("I have (\\d+) cookies with (.*) coffee");
    expect(stepParams.length).toEqual(2);
    expect(stepParams[0].parameStr).toEqual('(\\d+)');
    expect(stepParams[0].paramStartIndex).toEqual(7);
    expect(stepParams[1].parameStr).toEqual('(.*)');
    expect(stepParams[1].paramStartIndex).toEqual(26);

    stepParams = getStepParms("(\\d+) have cookies with (.*) coffee");
    expect(stepParams.length).toEqual(2);
    expect(stepParams[0].parameStr).toEqual('(\\d+)');
    expect(stepParams[0].paramStartIndex).toEqual(0);
    expect(stepParams[1].parameStr).toEqual('(.*)');
    expect(stepParams[1].paramStartIndex).toEqual(24);

    stepParams = getStepParms('I have (.*) with (.*) and (.*)');
    expect(stepParams.length).toEqual(3);
    expect(stepParams[0].parameStr).toEqual('(.*)');
    expect(stepParams[0].paramStartIndex).toEqual(7);
});

/*
it('get step suggest for a step with 1 argument', () => {
    var step = 'I have (\\d+) cookies';
    var compiledStep = compileStepDef(step);
    var suggest = getStepSuggest(compiledStep, 'I');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies');

    suggest = getStepSuggest(compiledStep, 'I ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies');

    suggest = getStepSuggest(compiledStep, 'I have 3');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies');
});

it('get step suggest for a step with multiple arguments', () => {
    var step = 'I have (\\d+) cookies and since (.*) years ago';
    var compiledStep = compileStepDef(step);
    var suggest = getStepSuggest(compiledStep, 'I');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies and since (.*) years ago');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies and since (.*) years ago');

    suggest = getStepSuggest(compiledStep, 'I have 3');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies and since (.*) years ago');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies and since (.*) years ago');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies and since 5');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies and since 5 years ago');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies and since (.*) years ago');
});

it('get step suggest for a step with one no-param block', () => {
    var step = 'I have (\\d+) cookies( which is bad)?';
    var compiledStep = compileStepDef(step);
    
    var suggest = getStepSuggest(compiledStep, 'I');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is bad)?');

    suggest = getStepSuggest(compiledStep, 'I ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is bad)?');

    suggest = getStepSuggest(compiledStep, 'I have 3');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is bad)?');
    
    suggest = getStepSuggest(compiledStep, 'I have 3 cookies ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies which is bad');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is bad)?');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies w');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies which is bad');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is bad)?');
});

it('get step suggest for a step with one param block', () => {
    var step = 'I have (\\d+) cookies( which is (.*) bad)?';
    var compiledStep = compileStepDef(step);

    var suggest = getStepSuggest(compiledStep, 'I');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)?');

    suggest = getStepSuggest(compiledStep, 'I ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)?');

    suggest = getStepSuggest(compiledStep, 'I have 3');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)?');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies which is (.*) bad');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)?');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies which is very');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies which is very bad');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)?');
})
*/

it('complete step with given parameter', () => {
    var step = 'I have (.*) cookies done (.*) times';
    var givenParams = [ '3 cookies', '' ];
    var result = completeStepWithGivenValue(step, givenParams);
    expect(result).toEqual('I have 3 cookies done (.*) times');

    givenParams = ['3 cookies done 5', ''];
    result = completeStepWithGivenValue(step, givenParams);
    expect(result).toEqual('I have 3 cookies done 5 times');

    step = 'I have (.*) with (.*) and (.*)';
    givenParams = [ 'hello t1 with no t2 and yes t3', '', ''];
    var result = completeStepWithGivenValue(step, givenParams);
    expect(result).toEqual('I have t1 with no t2 and yes t3');


})

it('get step suggest for a step with one param block in the middle of step', () => {
    var step = 'I have (.*) cookies( which is (.*) bad)? done (.*) times';
    var compiledStep = compileStepDef(step);
    /*
    var suggest = getStepSuggest(compiledStep, 'I');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies done (\\d+) times');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)? done (\\d+) times');

    suggest = getStepSuggest(compiledStep, 'I ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have (\\d+) cookies done (\\d+) times');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)? done (\\d+) times');

    suggest = getStepSuggest(compiledStep, 'I have 3 ');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies done (\\d+) times');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)? done (\\d+) times');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies done 5');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies done 5 times');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)? done (\\d+) times');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies w');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies which is (.*) bad done (\\d+) times');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)? done (\\d+) times');

    suggest = getStepSuggest(compiledStep, 'I have 3 cookies which is very');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies which is very bad done (\\d+) times');
    expect(suggest!.suggestStr).toEqual('I have (\\d+) cookies( which is (.*) bad)? done (\\d+) times');
    */

    
    /*
    var suggest = getStepSuggest(compiledStep, 'I have 3 cookies');
    expect(suggest).not.toBeNull();
    expect(suggest!.replaceStr).toEqual('I have 3 cookies done (.*) times');
    expect(suggest!.suggestStr).toEqual('I have (.*) cookies( which is (.*) bad)? done (.*) times');
    */
})