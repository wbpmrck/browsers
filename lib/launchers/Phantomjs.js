'use strict';

var fs = require('fs');
var util = require('util');

var BaseBrowser = require('./Base');
var helper = require('../helper')


var PhantomJSBrowser = function() {
  BaseBrowser.apply(this, arguments);

  this._start = function(url) {
    // create the js file, that will open karma
    var captureFile = this._tempDir + '/capture.js';
    var captureCode = '(new WebPage()).open("' + url + '");';
    fs.writeFileSync(captureFile, captureCode);

    // and start phantomjs
    this._execCommand(this._getCommand(), [captureFile]);
  };
};

util.inherits(PhantomJSBrowser, BaseBrowser);

helper.extend(PhantomJSBrowser.prototype, {
  name: 'PhantomJS',

  DEFAULT_CMD: {
    linux: require('phantomjs').path,
    darwin: require('phantomjs').path,
    win32: require('phantomjs').path
  },
  ENV_CMD: 'PHANTOMJS_BIN'
});


// PUBLISH
module.exports = PhantomJSBrowser;
