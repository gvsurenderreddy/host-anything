'use strict';

require('shelljs/global');

const format = require('string-format');
const BbPromise  = require('bluebird');
const fs         = require('fs');
const Git        = require('nodegit');
const Immutable  = require('seamless-immutable');
const path       = require('path');

BbPromise.onPossiblyUnhandledRejection(function(error) {
  throw error;
});
BbPromise.longStackTraces();

class Hostanything {
  constructor(config) {
    this._version   = require('./../package.json').version;
    this._cloneDir = path.join(__dirname, '..', './.tmp');
    this._distDir = path.join(__dirname, '..', './.dist');
    console.log(this._cloneDir);
  }
  command(argv) {
    const _this = this;

    _this.invocation = {
      url: null,
      pathInRepo: null,
      functionName: null,
      raw: argv
    };

    _this.supportedLanguages = {
      '.js': require('./languages/javascript.js')
    };

    _this.invocation.url = _this.invocation.raw._[0];
    _this.invocation.pathInRepo = _this.invocation.raw._[1];
    _this.invocation.callingCode = _this.invocation.raw._[2];
    rm('-rf', _this._cloneDir);
    rm('-rf', _this._distDir);
    mkdir(_this._distDir);
    Git.Clone(_this.invocation.url, _this._cloneDir)
      .then(function(repository) {
        const fullPath = path.join(_this._cloneDir, _this.invocation.pathInRepo);
        const ext = path.extname(fullPath);
        if (!(ext in _this.supportedLanguages)) {
          BbPromise.reject(format('Language unsupported: {}', ext));
        }
        const modifier = new _this.supportedLanguages[ext];
        modifier.modify(_this._cloneDir, _this.invocation.pathInRepo, _this.invocation.callingCode, _this._distDir);
      })
      .catch(function(err) { BbPromise.reject(err); })
      .done();
  }
}

module.exports = Hostanything;
