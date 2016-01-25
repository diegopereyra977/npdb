mocha-should
============

Alias 'should' to Mocha 'it'

## Usage

```bash
$ npm install mocha-should --save-dev
```

```js
var should = require("mocha-should");

describe("Test suite", function() {
  should("have true equal true", function() {
    expect(true).to.be.true;
  });
});
```