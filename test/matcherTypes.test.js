import test from 'node:test';
import assert from 'node:assert';
import { matchesBody } from '../app/store/expectationStore.js';

test('matches XML using XPath matcher', async (t) => {
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

  const expectationBody = {
    type: 'xpath',
    xpath: '//book[@category="reference"]'
  };

  const result = matchesBody(xmlString, expectationBody);
  assert.strictEqual(result, true);

  const negativeExpectationBody = {
    type: 'xpath',
    xpath: '//book[@category="history"]'
  };
  
  const negativeResult = matchesBody(xmlString, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

test('matches string using RegEx matcher', async (t) => {
  const testString = 'The quick brown fox jumps over the lazy dog';

  const expectationBody = {
    type: 'regex',
    regex: '.*?brown fox.*'
  };

  const result = matchesBody(testString, expectationBody);
  assert.strictEqual(result, true);

  const negativeExpectationBody = {
    type: 'regex',
    regex: '.*?black cat.*'
  };
  
  const negativeResult = matchesBody(testString, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

test('matches JSON with "not" flag', async (t) => {
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

  const result = matchesBody(testJson, expectationBody);
  assert.strictEqual(result, true);

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

test('matches JSON with JSONUnit placeholders', async (t) => {
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

  const result = matchesBody(testJson, expectationBody);
  assert.strictEqual(result, true);

  const negativeExpectationBody = {
    type: 'json',
    value: {
      glossary: {
        title: "${json-unit.any-number}",
        GlossDiv: {
          title: "${json-unit.any-boolean}",
          GlossList: "${json-unit.any-string}"
        }
      }
    }
  };
  
  const negativeResult = matchesBody(testJson, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
});

test('matches JSON using JSONPath matcher', async (t) => {
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

  const expectationBody = {
    type: 'jsonPath',
    value: '$.store.book[0].author'
  };

  const result = matchesBody(testJson, expectationBody);
  assert.strictEqual(result, true);

  const negativeExpectationBody = {
    type: 'jsonPath',
    value: '$.store.book[3]'
  };
  
  const negativeResult = matchesBody(testJson, negativeExpectationBody);
  assert.strictEqual(negativeResult, false);
}); 