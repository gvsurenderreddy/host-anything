'use strict';

require('shelljs/global');
const BbPromise  = require('bluebird'),
  esprima        = require('esprima'),
  fs             = require('fs'),
  format         = require('string-format'),
  path           = require('path'),
  Zip            = require('node-zip'),
  _template      = require('underscore').template;
const readdir = require('fs-readdir-recursive');

class JavascriptModifier {

  constructor() {
  }

  modify(repoPath, relativeFilePath, callingCode, distPath) {
    const npmInstall = exec('npm install', {cwd: repoPath});
    if (npmInstall.code != 0) {
      BbPromise.reject(format('npm install failed: {} {}', npmInstall.stdout, npmInstall.stderr));
    }
    const filePath = path.join(repoPath, relativeFilePath);
    const moduleName = path.basename(filePath, '.js');
    const fnName = '__hostanythingCallingFunction__ ';
    const initializerString = format('var {} = {}; {}(require("{}"));', fnName,
      callingCode, fnName, filePath);
    console.log(initializerString);
    const targetFunction = eval(initializerString);
    const parsedFunction = esprima.parse(format('var {} = {};', moduleName, targetFunction.toString()));
    const functionArgNames = parsedFunction.body[0].declarations[0].init.params.map(function(arg) { return arg.name; });
    const handlerTemplate = _template(fs.readFileSync(filePath, 'utf8'));
    const handlerContents = handlerTemplate({
      entryPointFilePath: relativeFilePath,
      moduleName: moduleName,
      entryPointCode: callingCode,
      entryPointArgNames: functionArgNames
    });
    const handlerFileName = '__host-anything-lambda-handler__.js';
    fs.writeFile(path.join(repoPath, handlerFileName), handlerContents);

    // Zip step from serverless lambda deploy
    let filesToZip = readdir(repoPath, function(fileName) { return fileName[0] !== '.'});

    let zip = new Zip();

    console.log(filesToZip);
    filesToZip.forEach(filePath => {
      console.log('in -> ' + filePath);
      const fullPath = path.join(repoPath, filePath);
      zip.file(fullPath, fs.readFileSync(fullPath));
    });

    this.zipBuffer = zip.generate({
      type:        'nodebuffer',
      compression: 'DEFLATE'
    });

    if (this.zipBuffer.length > 52428800) {
      BbPromise.reject(new SError(
          'Zip file is > the 50MB Lambda queued limit (' + this.zipBuffer.length + ' bytes)',
          SError.errorCodes.ZIP_TOO_BIG)
      );
    }

    // Set path of compressed package
    this.pathCompressed = path.join(distPath, 'package.zip');

    // Create compressed package
    fs.writeFileSync(this.pathCompressed, this.zipBuffer);
    console.log('zip done');

  }
}

module.exports = JavascriptModifier;