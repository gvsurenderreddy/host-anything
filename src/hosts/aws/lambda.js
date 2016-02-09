'use strict';

const fs            = require('fs');
const path          = require('path');
const readdir       = require('fs-readdir-recursive');
const Zip           = require('node-zip');

class AwsLambda {
  pack(repoPath, destPath) {
    const filesToZip = readdir(repoPath, function(fileName) {
      return fileName[0] !== '.';
    });
    const zip = new Zip();

    filesToZip.forEach(filePath => {
      const fullPath = path.join(repoPath, filePath);
      zip.file(filePath, fs.readFileSync(fullPath));
    });

    const zipBuffer = zip.generate({
      type:        'nodebuffer',
      compression: 'DEFLATE'
    });

    if (zipBuffer.length > 52428800) {
      throw new Error('Zip file is > the 50MB Lambda queued limit (' + zipBuffer.length + ' bytes)');
    }

    // Set path of compressed package
    const pathCompressed = path.join(destPath, 'package.zip');

    // Create compressed package
    fs.writeFileSync(pathCompressed, zipBuffer);
  }
}

module.exports = AwsLambda;