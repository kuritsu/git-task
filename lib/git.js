/**
 * Created by jeff on 11/08/16.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const child_process = require('child_process');

require('./common');

/**
 * Git functions related with git-task.
 * @constructor
 */
function Git() {
    this.taskDir = this.getRepoDir() + path.sep + ".tasks";
    this.dataDir = this.taskDir + path.sep + "data";
}

/**
 * Ensures the data dir is created.
 */
Git.prototype.checkDataDir = function() {
    if (fs.existsSync(this.dataDir)) {
        return;
    }
    fs.mkdirSync(this.dataDir);
};

/**
 * Creates a digest (base64 id) for an item.
 * @returns {*} Item ID.
 */
Git.prototype.createItemId = function () {
    var hmac = crypto.createHmac('sha256', Date.now().toString());
    return hmac.digest('hex');
};

/**
 * Invoke git.
 * @param args String arguments.
 * @param showLog True if method should log on the console. False if not.
 */
Git.prototype.git = function(args, showLog) {
    var line = 'git ' + args;
    showLog && console.info('Calling git: ' + line);
    var result = child_process.execSync(line).toString().trim();
    showLog && console.log(result);
    return result;
};

/**
 * Gets the git repository base dir.
 */
Git.prototype.getRepoDir = function() {
    return this.git('rev-parse --show-toplevel');
};

/**
 * Adds a file to the git repository.
 * @param fileName File name.
 */
Git.prototype.gitAdd = function(fileName) {
    this.git('add --verbose ' + fileName.quote(), true);
};

/**
 * Removes a file from git and delete it.
 * @param fileName File name.
 */
Git.prototype.gitRm = function(fileName) {
    this.git('rm --force ' + fileName.quote(), true);
};

/**
 * Unstages a file from git.
 * @param fileName File name.
 */
Git.prototype.gitUnstage = function(fileName) {
    this.git('reset HEAD ' + fileName.quote(), true);
};

/**
 * Gets the git status for task items.
 * @returns {*} String of the git status such as:
 * A  .tasks/data/0ae54bd852ad6a68481f0884f04c4f13ff79b98623cd0f9615300aaa0794c71e
 *  M .tasks/data/1ad8a826fa0c95d0f3a087740499eea51dfa9bb043cd8613f40bf7f0e99dcf87
 * ?? .tasks/data/b82c194529c8918d3f175462339c082174379cc668c2dd75ac1a2430714e4ae0
 * Where A is added, M is modified, R is renamed, D deleted and ?? is untracked
 */
Git.prototype.gitGetTaskStatus = function(fileName) {
    if (!fileName) {
        fileName = this.dataDir;
    }
    return this.git('status --porcelain ' + fileName.quote()).split('\n');
};

/**
 * Check out (undo changes) of a file in git.
 * @param fileName File name.
 */
Git.prototype.gitCheckout = function(fileName) {
    this.git('checkout -- ' + fileName.quote(), true);
};

/**
 * Commits with git.
 */
Git.prototype.gitCommit = function(message) {
    var messageArg = "";
    if (message) {
        messageArg = "-m " + message.quote();
    }
    this.git('commit ' + messageArg + " -- " + this.taskDir.quote(), true);
};

/**
 * Gets the current git branch.
 */
Git.prototype.gitGetBranch = function() {
    var branches = this.git('branch --no-color').split('\n');
    var currentBranch = branches.find(function(item) {
        item = item.trim();
        return (item.length > 0 && item[0] == '*');
    });
    if (typeof currentBranch === 'undefined') {
        return "";
    }
    return currentBranch.substr(2);
};

//NOTICE: Do not modify from this point.
if (typeof module !== 'undefined')
    module.exports = new Git();