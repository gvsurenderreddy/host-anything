'use strict';

require('shelljs/global');

const format     = require('string-format');
const path       = require('path');

class Hostanything {

  constructor() {
    this._version   = require('./../package.json').version;
    this._cloneDir = path.join(__dirname, '..', './.tmp');
    this._distDir = path.join(__dirname, '..', './.dist');
  }

  command(argv) {
    const _this = this;

    _this.invocation = {
      url: null,
      pathInRepo: null,
      functionName: null,
      sourceType: 'Git',
      hostType: 'AwsLambda',
      raw: argv
    };

    this.supportedSources = {
      Git: require('./sources/git.js')
    };
    this.supportedLanguages = {
      '.js': require('./languages/javascript/support.js')
    };
    this.supportedHosts = {
      AwsLambda: require('./hosts/aws/lambda.js')
    };

    _this.invocation.url = _this.invocation.raw._[0];
    _this.invocation.pathInRepo = _this.invocation.raw._[1];
    _this.invocation.callingCode = _this.invocation.raw._[2];

    rm('-rf', _this._cloneDir);
    rm('-rf', _this._distDir);
    mkdir(_this._distDir);

    const fullPath = path.join(_this._cloneDir, _this.invocation.pathInRepo);
    const ext = path.extname(fullPath);

    if (!(ext in this.supportedLanguages)) {
      throw new Error(format('Language unsupported: {}', ext));
    }

    if (!(_this.invocation.sourceType in this.supportedSources)) {
      throw new Error(format('Source type unsupported: {}', _this.invocation.sourceType));
    }

    if (!(_this.invocation.hostType in this.supportedHosts)) {
      throw new Error(format('Host type unsupported: {}', _this.invocation.hostType));
    }

    const sourceSupport = new _this.supportedSources[_this.invocation.sourceType]();
    // Special case for now, cannot bind on Git.Clone
    const retrieve = sourceSupport.retriever;

    const languageSupport = new _this.supportedLanguages[ext]();
    const prepare = languageSupport.prepare.bind(languageSupport);

    const hostSupport = new _this.supportedHosts[_this.invocation.hostType]();
    const pack = hostSupport.pack.bind(hostSupport);

    retrieve(_this.invocation.url, _this._cloneDir)
      .then(function() {
        prepare(
          _this._cloneDir,
          _this.invocation.pathInRepo,
          _this.invocation.callingCode,
          _this.invocation.hostType
        );
      })
      .then(function() {
        pack(
          _this._cloneDir,
          _this._distDir
        );
      });
  }
}

module.exports = Hostanything;
