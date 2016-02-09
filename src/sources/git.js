'use strict';

const Git = require('nodegit');

class GitSource {
  constructor() {
    this.retriever = Git.Clone;
  }
}

module.exports = GitSource;
