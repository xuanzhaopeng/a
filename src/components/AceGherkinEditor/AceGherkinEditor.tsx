import * as React from 'react';
import * as ace from 'brace';
import 'brace/mode/gherkin';
import 'brace/theme/monokai';
import { matches } from './matcher';
import './AceGherkinEditor.css';
import { type } from 'os';
import { Lexer } from './gherkin/gherkin-en';
const { Range } = ace.acequire("ace/range");

interface AceGherkinEditorProps {
  defaultTheme: string
  fontSize: string
}

interface AceGherkinEditorState {
  hasLexerError: boolean,
}

const editorContainerStyle = {
  width: '100%',
  height: '-webkit-fill-available'
}

const stepDefs = {
  '^I open web page( without correct cookies)?$': [],
  '^I did (\\d+) times?( with number (\\d+))?$': [],
  '^(I|You) start test$': [],
  '^I set username to "(.*)"$': [],
  '^I got( maybe with (.*))? done( but (.*) aha)?$': [],
  '^I have (\\d+) cukes of (.*) in my belly$': [],
  '^I go to (new york|paris|berlin) with (qa|pm|dev)$': [],
  /*
  '^I make a syntax error$': [],
  '^(I|You) start test$': [],
  '^I (?:open|navigate) to (.*)$': [],
  '^I go to (new york|paris|berlin)$': [],
  '^I go do( the number (\\d+) test abc)?$': [],
  '^I did (\\d+) times?( with number (\\d+))?$': [],
  '^I have (\\d+) cukes in my belly$': [],
  '^I have eaten all the cukes$': [],
  '^stuff should be (.*)$': []
  */
}

export class AceGherkinEditor extends React.Component<AceGherkinEditorProps, AceGherkinEditorState> {
  private editorRef: React.RefObject<HTMLDivElement>;
  private editor!: ace.Editor;
  private editorSearch!: ace.Search;
  private lexer: any;
  private suggestListHtmlElement: HTMLElement;
  private autoCompleteActive: boolean;
  private autoCompleteLine: number;
  private autoCompleteKeyword: string;
  private autoCompleteName: string;
  private autoCompleteRow: number;
  private autoCompleteCol: number;

  private _onTextInput!: (text: string) => void;
  private _editorSoftTabs!: boolean;
  private _editorGoLineDownExec!: any;
  private _editorGoLineUpExec!: any;

  constructor(props: AceGherkinEditorProps) {
    super(props);
    this.state = {
      hasLexerError: false,
    }
    this.editorRef = React.createRef();

    this.autoCompleteActive = false;
    this.autoCompleteLine = 0;
    this.autoCompleteKeyword = "";
    this.autoCompleteName = "";
    this.autoCompleteRow = 0;
    this.autoCompleteCol = 0;

    this['onEditorChange'] = this['onEditorChange'].bind(this);
    this['onLexerStep'] = this['onLexerStep'].bind(this);
    this['onAutoComplete'] = this['onAutoComplete'].bind(this);
    this['onAutoCompleteGolineDonw'] = this['onAutoCompleteGolineDonw'].bind(this);
    this['onAutoCompleteGolineUp'] = this['onAutoCompleteGolineUp'].bind(this);
    this['deactivateAutoComplete'] = this['deactivateAutoComplete'].bind(this);
    this['onAutoCompleteTextInput'] = this['onAutoCompleteTextInput'].bind(this);
    var lexerListener = {
      comment: this.onLexerComment,
      tag: this.onLexerTag,
      feature: this.onLexerFeature,
      background: this.onLexerBackground,
      scenario: this.onLexerScenario,
      step: this.onLexerStep,
      scenario_outline: this.onLexerScenarioOutline,
      examples: this.onLexerExamples,
      py_string: this.onLexerPyString,
      row: this.onLexerRow,
      eof: this.onLexerEof
    }
    this.lexer = new Lexer(lexerListener)

    this.suggestListHtmlElement = document.createElement('ul');
    this.initSuggestElement();
  }

  initSuggestElement() {
    this.suggestListHtmlElement.id = "ace_autocomplete_list";
    this.suggestListHtmlElement.className = 'ace_autocomplete';
    this.suggestListHtmlElement.style.display = 'none';
    this.suggestListHtmlElement.style.listStyleType = 'none';
    this.suggestListHtmlElement.style.padding = '2px';
    this.suggestListHtmlElement.style.position = 'fixed';
    this.suggestListHtmlElement.style.zIndex = '1000';
  }

  componentDidMount() {
    this.editor = ace.edit(this.editorRef.current!);
    this.editorSearch = (this.editor as any).$search;
    this.editor.getSession().setMode('ace/mode/gherkin');
    this.editor.setTheme('ace/theme/' + this.props.defaultTheme);
    this.editor.setFontSize(this.props.fontSize);
    this.editor.session.on('change', this.onEditorChange);
    this.editor.container.appendChild(this.suggestListHtmlElement);
    this.editor.$blockScrolling = Infinity;

    this._onTextInput = this.editor.onTextInput;
    this._editorSoftTabs = this.editor.session.getUseSoftTabs();
    this._editorGoLineDownExec = this.editor.commands.byName.golinedown.exec;
    this._editorGoLineUpExec = this.editor.commands.byName.golineup.exec;
  }

  render() {
    return <div ref={this.editorRef} style={editorContainerStyle} id="gherkin-editor"></div>;
  }

  onEditorChange(e: any) {
    var source = this.editor.getSession().getValue();
    try {
      this.lexer.scan(source);
      this.setState({ hasLexerError: false });
    } catch (exception) {
      this.setState({ hasLexerError: true });
      var line = exception.match(/Lexing error on line (\d+):/)[1];
      this.onLexerError(line, exception);
    }
  }

  onLexerError(line: number, err: any) {
    console.error('error line:' + line);
    this.setState({ hasLexerError: true });
    if(this.autoCompleteActive) {
      this.deactivateAutoComplete();
    }
  }

  onLexerComment(value: string, line: number) { }
  onLexerTag(value: string, line: number) { }
  onLexerFeature(keyword: string, name: string, description: string, line: number) { }
  onLexerBackground(keyword: string, name: string, description: string, line: number) { }
  onLexerScenario(keyword: string, name: string, description: string, line: number) { }
  onLexerScenarioOutline(keyword: string, name: string, description: string, line: number) { }
  onLexerExamples(keyword: string, name: string, description: string, line: number) { }
  onLexerPyString(string: string, line: string) { }
  onLexerRow(row: any, line: number) { }
  onLexerEof() { }
  onLexerStep(keyword: string, name: string, line: number, err: any) {
    if (!err) {
      console.log("step dynamic checking");
      this.autoCompleteLine = line;
      this.autoCompleteKeyword = keyword;
      this.autoCompleteName = name;
      setTimeout(this.onAutoComplete, 0);
    } else {
      this.onLexerError(line, err);
    }
  }

  onAutoComplete() {
    var range = this.editor.getSelectionRange();
    if (this.autoCompleteLine == range.start.row + 1) {
      range.start.column = 0;
      this.editor.selection.setSelectionRange(range);
      this.editorSearch.set({ needle: this.autoCompleteKeyword });
      var keywordRange = this.editorSearch.find(this.editor.session);
      this.editor.selection.clearSelection();
      if (keywordRange) {
        var keywordColumn = keywordRange.end.column;
        this.activeAutoComplete(range.start.row, keywordColumn);
        this.suggestAutoComplete(this.autoCompleteName);
      }
    }
  }

  activeAutoComplete(row: number, col: number) {
    if (this.autoCompleteActive) return;
    this.autoCompleteActive = true;
    this.autoCompleteRow = row;
    this.autoCompleteCol = col;

    var suggestListPositionCoordinates = this.editor.renderer.textToScreenCoordinates(row, col);
    this.suggestListHtmlElement.style.top = suggestListPositionCoordinates.pageY + 2 + 'px';
    this.suggestListHtmlElement.style.left = suggestListPositionCoordinates.pageX + -2 + 'px';
    this.suggestListHtmlElement.style.display = 'block';

    this.editor.session.setUseSoftTabs(false);
    this.editor.commands.byName.golinedown.exec = this.onAutoCompleteGolineDonw;
    this.editor.commands.byName.golineup.exec = this.onAutoCompleteGolineUp;
    this.editor.commands.addCommand({
      name: "hideautocomplete",
      bindKey: { win: "Esc", mac: "Esc", sender: "editor" },
      exec: this.deactivateAutoComplete
    });
    this.editor.onTextInput = this.onAutoCompleteTextInput;
  }

  suggestAutoComplete(text: string) {
    var _options = matches(stepDefs, text);
    if(_options.length == 0) {
      return this.deactivateAutoComplete();
    }
    var html = '';
    for(var n in _options) {
      html += '<li data-step="' + encodeURI(_options[n].replaceStr) + '">' + _options[n].suggest + '</li>';
    }
    this.suggestListHtmlElement.innerHTML = html;
    this.ensureEditorFocus();
  }

  deactivateAutoComplete() {
    this.suggestListHtmlElement.style.display = 'none';
    this.editor.session.setUseSoftTabs(this._editorSoftTabs);
    this.editor.commands.byName.golinedown.exec = this._editorGoLineDownExec;
    this.editor.commands.byName.golineup.exec = this._editorGoLineUpExec;
    this.editor.onTextInput = this._onTextInput;
    this.autoCompleteActive = false;
  }

  onAutoCompleteGolineDonw(env: any, args: any, request: any) {
    var curr = this.getCurrentSuggestItem();
    curr!.className = '';
    var focus = curr!.nextSibling as HTMLElement  || curr!.parentNode!.firstChild as HTMLElement ;
    focus!.className = 'ace_autocomplete_selected';
  }

  onAutoCompleteGolineUp(env: any, args: any, request: any) {
    var curr = this.getCurrentSuggestItem();
    curr!.className = '';
    var focus: HTMLElement = curr!.previousSibling as HTMLElement || curr!.parentNode!.lastChild as HTMLElement;
    focus!.className = 'ace_autocomplete_selected';
  }

  onAutoCompleteTextInput(text: string) {
    if (text == '\n' || text == '\t') {
      console.log("auto replace....");
      this.autoReplace();
    } else {
      this._onTextInput.call(this.editor, text);
    }
  }

  autoReplace() {
    var range:ace.Range = new Range(this.autoCompleteRow, this.autoCompleteCol, this.autoCompleteRow, this.autoCompleteCol + 1000);
    var selectedValue = this.getCurrentSuggestItem()!.getAttribute('data-step');
    if(selectedValue) {
      selectedValue = decodeURI(selectedValue);
    }
    console.log("replace value:" + selectedValue);
    this.editor.session.replace(range, selectedValue!);
    setTimeout(this.deactivateAutoComplete, 0);
  }

  getCurrentSuggestItem(): HTMLElement | null {
    var suggestItems: NodeListOf<ChildNode> = this.suggestListHtmlElement.childNodes;
    for (var i = 0; i < suggestItems.length; i++) {
      var suggestItem: HTMLElement = (suggestItems[i] as HTMLElement);
      if (suggestItem.className == 'ace_autocomplete_selected') {
        return suggestItem;
      }
    };
    return null;
  }

  ensureEditorFocus() {
    if (!this.getCurrentSuggestItem()) {
      var child = this.suggestListHtmlElement.firstChild as HTMLElement;
      child.className = 'ace_autocomplete_selected';
    }
  }
}