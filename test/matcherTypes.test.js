import test from 'node:test';
import assert from 'node:assert';
import { matchesBody } from '../src/store/expectationStore.js';

// Test dla XPATH matchera
test('matches XML using XPath matcher', async (t) => {
  // XML do testowania
  const xmlString = `
    <store>
      <book category="reference">
        <title lang="en">XQuery Kick Start</title>
        <author>James McGovern</author>
        <year>2003</year>
        <price>49.99</price>
      </book>
      <book category="fiction">
        <title lang="en">Learning XML</title>
        <author>Erik T. Ray</author>
        <year>2003</year>
        <price>39.95</price>
      </book>
    </store>
  `;
  
  // XPath, który powinien znaleźć książkę o kategorii "reference"
  const expectationBody = {
    type: 'xpath',
    xpath: '//book[@category="reference"]'
  };
  
  // Test XPath
  const result = matchesBody(xmlString, expectationBody);
  assert.strictEqual(result, true);
  
  // XPath, który nie powinien nic znaleźć
  const negativeExpectationBody = {
    type: 'xpath',
    xpath: '//book[@category="history"]'
  };
  
  const negativeResult = matchesBody(xmlString, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

// Test dla REGEX matchera
test('matches string using RegEx matcher', async (t) => {
  // String do testowania
  const testString = 'The quick brown fox jumps over the lazy dog';
  
  // Regex, który powinien dopasować się do stringa
  const expectationBody = {
    type: 'regex',
    regex: '.*?brown fox.*'
  };
  
  // Test RegEx
  const result = matchesBody(testString, expectationBody);
  assert.strictEqual(result, true);
  
  // Regex, który nie powinien się dopasować
  const negativeExpectationBody = {
    type: 'regex',
    regex: '.*?black cat.*'
  };
  
  const negativeResult = matchesBody(testString, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

// Test dla JSON z flagą "not"
test('matches JSON with "not" flag', async (t) => {
  // JSON do testowania
  const testJson = {
    menu: {
      id: "file",
      value: "File",
      popup: {
        menuitem: [
          { value: "New", onclick: "CreateNewDoc()" },
          { value: "Open", onclick: "OpenDoc()" }
        ]
      }
    }
  };
  
  // Oczekiwanie z flagą not=true
  const expectationBody = {
    type: 'json',
    not: true,
    value: {
      menu: {
        id: "edit",
        value: "Edit",
        popup: {
          menuitem: [
            { value: "Cut", onclick: "Cut()" },
            { value: "Copy", onclick: "Copy()" }
          ]
        }
      }
    }
  };
  
  // Test JSON z flagą not
  const result = matchesBody(testJson, expectationBody);
  assert.strictEqual(result, true);
  
  // Oczekiwanie z flagą not=true, ale pasujące do JSON
  const negativeExpectationBody = {
    type: 'json',
    not: true,
    value: {
      menu: {
        id: "file",
        value: "File",
        popup: {
          menuitem: [
            { value: "New", onclick: "CreateNewDoc()" },
            { value: "Open", onclick: "OpenDoc()" }
          ]
        }
      }
    }
  };
  
  const negativeResult = matchesBody(testJson, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

// Test dla JSONUnit placeholders
test('matches JSON with JSONUnit placeholders', async (t) => {
  // JSON do testowania
  const testJson = {
    glossary: {
      title: "example glossary",
      GlossDiv: {
        title: "S",
        GlossList: {
          GlossEntry: {
            ID: "SGML",
            SortAs: "SGML",
            GlossTerm: "Standard Generalized Markup Language",
            Acronym: "SGML",
            Abbrev: "ISO 8879:1986",
            GlossDef: {
              para: "A meta-markup language, used to create markup languages such as DocBook."
            },
            GlossSee: "markup"
          }
        }
      }
    }
  };
  
  // Oczekiwanie z placeholderami JSONUnit
  const expectationBody = {
    type: 'json',
    value: {
      glossary: {
        title: "${json-unit.any-string}",
        GlossDiv: {
          title: "S",
          GlossList: {
            GlossEntry: {
              ID: "SGML",
              SortAs: "${json-unit.any-string}",
              GlossTerm: "${json-unit.any-string}",
              Acronym: "${json-unit.any-string}",
              Abbrev: "${json-unit.any-string}",
              GlossDef: "${json-unit.any-object}",
              GlossSee: "${json-unit.any-string}"
            }
          }
        }
      }
    }
  };
  
  // Test JSONUnit placeholders
  const result = matchesBody(testJson, expectationBody);
  assert.strictEqual(result, true);
  
  // Oczekiwanie z placeholderami JSONUnit, ale z błędnymi typami
  const negativeExpectationBody = {
    type: 'json',
    value: {
      glossary: {
        title: "${json-unit.any-number}", // Błędny typ (string vs number)
        GlossDiv: {
          title: "${json-unit.any-boolean}", // Błędny typ (string vs boolean)
          GlossList: "${json-unit.any-string}" // Błędny typ (object vs string)
        }
      }
    }
  };
  
  const negativeResult = matchesBody(testJson, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

// Test dla JSONPath matchera
test('matches JSON using JSONPath matcher', async (t) => {
  // JSON do testowania
  const testJson = {
    store: {
      book: [
        {
          category: "reference",
          author: "Nigel Rees",
          title: "Sayings of the Century",
          price: 8.95
        },
        {
          category: "fiction",
          author: "Herman Melville",
          title: "Moby Dick",
          isbn: "0-553-21311-3",
          price: 8.99
        }
      ],
      bicycle: {
        color: "red",
        price: 19.95
      }
    },
    expensive: 10
  };
  
  // JSONPath, który powinien znaleźć autora pierwszej książki
  const expectationBody = {
    type: 'jsonPath',
    value: '$.store.book[0].author'
  };
  
  // Test JSONPath
  const result = matchesBody(testJson, expectationBody);
  assert.strictEqual(result, true);
  
  // JSONPath, który nie powinien nic znaleźć
  const negativeExpectationBody = {
    type: 'jsonPath',
    value: '$.store.book[3]'
  };
  
  const negativeResult = matchesBody(testJson, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
}); 