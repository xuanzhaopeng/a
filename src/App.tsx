import React, { Component } from 'react';
import './App.css';
import {AceGherkinEditor} from './components/AceGherkinEditor';

declare global {
  interface Window { ace: any }
  interface RegExp { toPartialMatchRegex : () => RegExp }
}

class App extends Component {
  render() {
    return (
        <div className="App">
          <AceGherkinEditor defaultTheme="monokai" fontSize="14px" ></AceGherkinEditor>
        </div>
    );
  }
}

export default App;
