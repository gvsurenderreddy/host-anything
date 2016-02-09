'use strict';

require('shelljs/global');

const esprima       = require('esprima');
const execSync          = require('child_process').execSync;
const fs            = require('fs');
const format        = require('string-format');
const path          = require('path');
const _template     = require('underscore').template;

class JavascriptSupport {

  prepare(repoPath, entryPointPath, initializationCode, hostType) {
    const _this = this;
    const javascriptHostSupport = {
      'AwsLambda': _this.prepareForAwsLambda.bind(_this)
    };
    execSync('npm install', {cwd: repoPath});
    if (!(hostType in javascriptHostSupport)) {
      throw new Error(format('hostType {} not supported', hostType));
    }
    const hostSupport = javascriptHostSupport[hostType];
    hostSupport(repoPath, entryPointPath, initializationCode);
  }

  prepareForAwsLambda(repoPath, relativeFilePath, initializationCode) {
    const filePath = path.join(repoPath, relativeFilePath);
    const moduleName = path.basename(filePath, '.js');
    const fnName = '__hostanythingCallingFunction__ ';
    const initializerString = format(
      'var {} = {}; {}(require("{}"));',
      fnName,
      initializationCode,
      fnName,
      filePath
    );

    const targetFunction = eval(initializerString);

    const parsedFunction = esprima.parse(format('var {} = {};', moduleName, targetFunction.toString()));
    const functionArgNames = parsedFunction.body[0].declarations[0].init.params.map(function(arg) { return arg.name; });

    const templateContent = fs.readFileSync(path.join(__dirname, 'templates/lambda.template'), 'utf8');
    const handlerTemplate = _template(templateContent);
    const handlerContents = handlerTemplate({
      entryPointFilePath: relativeFilePath,
      moduleName: moduleName,
      entryPointCode: initializationCode,
      entryPointArgNames: functionArgNames
    });
    const handlerFileName = '__host-anything-lambda-handler__.js';
    fs.writeFileSync(path.join(repoPath, handlerFileName), handlerContents);
  }
}

module.exports = JavascriptSupport;