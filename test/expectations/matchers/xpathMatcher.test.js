/**
 * Tests for XPath Matcher
 * @module test/expectations/matchers/xpathMatcher.test
 */

import test from 'node:test';
import assert from 'node:assert';
import { matchXPath } from '../../../app/expectations/matchers/xpathMatcher.js';
import pkg from 'xmldom';
const { DOMParser } = pkg;

test('matchXPath matches valid XML with simple XPath expressions', (t) => {
  const xml = `
    <root>
      <person id="1">
        <name>John</name>
        <age>30</age>
        <address>
          <street>123 Main St</street>
          <city>Anytown</city>
          <state>CA</state>
          <zip>12345</zip>
        </address>
      </person>
      <person id="2">
        <name>Jane</name>
        <age>25</age>
        <address>
          <street>456 Oak Ave</street>
          <city>Othertown</city>
          <state>NY</state>
          <zip>67890</zip>
        </address>
      </person>
    </root>
  `;

  assert.strictEqual(matchXPath(xml, '/root'), true);
  assert.strictEqual(matchXPath(xml, '/root/person'), true);
  assert.strictEqual(matchXPath(xml, '/root/person/name'), true);
  assert.strictEqual(matchXPath(xml, '/root/person/@id'), true);
  assert.strictEqual(matchXPath(xml, '/root/person[@id="1"]'), true);
  assert.strictEqual(matchXPath(xml, '/root/person[@id="2"]/name'), true);
  assert.strictEqual(matchXPath(xml, '/root/person[1]'), true);
  assert.strictEqual(matchXPath(xml, '/root/person[2]/age'), true);
  assert.strictEqual(matchXPath(xml, '/root/nonexistent'), false);
});

test('matchXPath handles XML with namespaces', (t) => {
  const xmlWithNamespaces = `
    <root xmlns:ns1="http://example.com/ns1" xmlns:ns2="http://example.com/ns2">
      <ns1:element>Value 1</ns1:element>
      <ns2:element>Value 2</ns2:element>
    </root>
  `;

  assert.strictEqual(matchXPath(xmlWithNamespaces, '/root/*'), true);
  assert.strictEqual(matchXPath(xmlWithNamespaces, '/*[local-name()="root"]/*[local-name()="element"]'), true);
});

test('matchXPath handles invalid XML', (t) => {
  const invalidXml = '<root><element>Unclosed';

  assert.strictEqual(matchXPath(invalidXml, '/root'), true);
});

test('matchXPath handles non-string inputs by converting to JSON string', (t) => {
  const jsonObject = {
    root: {
      person: {
        name: 'John',
        age: 30
      }
    }
  };

  assert.strictEqual(matchXPath(jsonObject, '/*'), false);
});

test('matchXPath handles null and undefined', (t) => {
  assert.strictEqual(matchXPath(null, '/root'), false);
  assert.strictEqual(matchXPath(undefined, '/root'), false);
});

test('matchXPath handles invalid XPath expressions', (t) => {
  const xml = '<root><element>Value</element></root>';

  assert.strictEqual(matchXPath(xml, 'invalid::xpath'), false);
  assert.strictEqual(matchXPath(xml, ''), false);
  assert.strictEqual(matchXPath(xml, null), false);
  assert.strictEqual(matchXPath(xml, undefined), false);
});

test('matchXPath handles XML with CDATA sections', (t) => {
  const xmlWithCdata = `
    <root>
      <element><![CDATA[This is <b>CDATA</b> content]]></element>
    </root>
  `;

  assert.strictEqual(matchXPath(xmlWithCdata, '/root/element'), true);
  assert.strictEqual(matchXPath(xmlWithCdata, '/root/element[contains(., "CDATA")]'), true);
});

test('matchXPath handles XML with special characters', (t) => {
  const xmlWithSpecialChars = `
    <root>
      <element>&lt;special&gt; &amp; &quot;characters&quot;</element>
    </root>
  `;

  assert.strictEqual(matchXPath(xmlWithSpecialChars, '/root/element'), true);
  assert.strictEqual(matchXPath(xmlWithSpecialChars, '/root/element[contains(., "special")]'), true);
}); 