/**
 * Created by jeff on 3/08/16.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const git = require('./git');

require('./common');

/**
 * Represents the git-task server service.
 * @constructor
 */
function GitTaskServer() {
}

/**
 * Gets content type from file name.
 * @param fileName File name.
 */
GitTaskServer.prototype.getContentTypeFromFileName = function(fileName) {
    if (fileName.endsWith('.css')) {
        return "text/css";
    }
    if (fileName.endsWith('.js')) {
        return "text/javascript";
    }
    return "text/html";
};

/**
 * Saves the object to a file.
 * @param obj Object to save.
 * @returns The task object.
 */
GitTaskServer.prototype.saveObjectToFile = function(obj) {
    git.checkDataDir();
    var fileName = git.dataDir + path.sep + obj.id;
    fs.writeFileSync(fileName, JSON.stringify(obj, null, 2));
    console.info("File '%s' saved.", fileName);
    var result = obj;
    switch (obj.gitStatus) {
        case '??':
            git.gitUnstage(fileName);
            break;
        case '--':
            git.gitUnstage(fileName);
            git.gitCheckout(fileName);
            result = this.readObjectFromFile(obj.id);
            break;
        default:
            git.gitAdd(fileName);
            break;
    }
    var gitStatus = git.gitGetTaskStatus(fileName);
    this.updateTaskGitStatus(result, gitStatus);
    return result;
};

/**
 * Reads a task from a file.
 * @param fileName File name.
 */
GitTaskServer.prototype.readObjectFromFile = function(fileName) {
    var fileContent = fs.readFileSync(git.dataDir + path.sep + fileName);
    var task = JSON.parse(fileContent);
    return task;
};

/**
 * Serves a file directly to the browser.
 * @param res HTTP Response
 * @param pathname Path name of the URL
 */
GitTaskServer.prototype.serveFile = function(res, pathname) {
    var fileName = pathname == null || pathname == "/"
        ? "tasks.html" : pathname;
    fileName = path.sep != '/' ?
        fileName.replaceAll('/', path.sep) : fileName;
    fileName = git.taskDir + path.sep + fileName;
    console.log('GET: %s.', pathname);
    if (!fs.existsSync(fileName)) {
        res.writeHead(500, {});
        console.error("Invalid access to file '%s'.", fileName);
        res.end("");
        return;
    }
    res.writeHead(200, {'Content-type': this.getContentTypeFromFileName(fileName)});
    var fileContent = fs.readFileSync(fileName);
    res.end(fileContent);
};

/**
 * Reports successful response with an object.
 * @param response HTTP response.
 * @param obj Object to return.
 */
GitTaskServer.prototype.reportSuccess = function(response, obj) {
    response.writeHead(200, {'Content-type': 'application/json'});
    var responseBody = {
        "status":"success"
    };
    if (obj) {
        responseBody.obj = obj;
    }
    response.end(JSON.stringify(responseBody));
};

/**
 * Reports an error as a json response.
 * @param response HTTP response.
 * @param errorMessage Error message.
 * @param exception Exception if needs saving to the log.
 */
GitTaskServer.prototype.reportError = function(response, errorMessage, exception) {
    if (exception) {
        console.error("%s %s", errorMessage, JSON.stringify(exception));
    }
    response.writeHead(500, {'Content-type': 'application/json'});
    var responseBody = {
        "status":"error",
        "msg": errorMessage
    };
    response.end(JSON.stringify(responseBody));
};

/**
 * Processes a POST request.
 * @param parsedData Parsed request data.
 * @param res HTTP Response.
 */
GitTaskServer.prototype.postItem = function(parsedData, res) {
    if (!parsedData.id) {
        parsedData.id = git.createItemId();
    }
    if (!parsedData.createdAt) {
        parsedData.createdAt = Date.now();
    }
    parsedData.updatedAt = Date.now();
    try {
        parsedData = this.saveObjectToFile(parsedData);
    }
    catch (e) {
        return this.reportError(res, 'Error processing item.', e);
    }
    this.reportSuccess(res, parsedData);
};

/**
 * Updates the status in git of a task.
 * @param task Task to update.
 * @param gitStatusList Status list from git.
 */
GitTaskServer.prototype.updateTaskGitStatus = function(task, gitStatusList) {
    task.gitStatus = '  ';
    if (typeof task.id !== 'string')
        return;
    gitStatusList.forEach(function(item) {
        if (item.endsWith(path.sep + task.id)) {
            task.gitStatus = item.substr(0, 2);
        }
    });
};

/**
 * Read the items from disk.
 * @returns {Array} Item array.
 */
GitTaskServer.prototype.readItems = function () {
    var th1s = this;
    console.log("Checking data dir '%s'.", git.dataDir);
    git.checkDataDir();
    var files = fs.readdirSync(git.dataDir);
    var items = [];
    var gitStatusList = git.gitGetTaskStatus();
    files.forEach(function (item) {
        try {
            var task = th1s.readObjectFromFile(item);
            th1s.updateTaskGitStatus(task, gitStatusList);
            items.push(task);
        } catch (e) {
            console.error("Error reading file '%s'.", item);
        }
    });
    return items;
};

/**
 * Gets the tasks items.
 * @param res HTTP response.
 */
GitTaskServer.prototype.getItems = function(res) {
    try {
        var items = this.readItems();
        var obj = {
            tasks: items,
            meta: {
                branch: git.gitGetBranch()
            }
        };
        this.reportSuccess(res, obj);
    } catch (e) {
        this.reportError(res, "Error reading tasks.", e);
    }
};

/**
 * Delete a task item.
 * @param itemId Item ID.
 * @param res HTTP Response.
 */
GitTaskServer.prototype.deleteItem = function(itemId, res) {
    console.log('Deleting task %s.', itemId);
    try {
        git.gitRm(git.dataDir + path.sep + itemId);
        this.reportSuccess(res);
    }
    catch (e) {
        this.reportError(res, "Error deleting task.");
    }
};

/**
 * Commits the git-task directory.
 * @param message Commit message.
 * @param res HTTP response.
 */
GitTaskServer.prototype.commit = function(message, res) {
    try {
        git.gitCommit(message);
        this.reportSuccess(res);
    }
    catch (e) {
        this.reportError(res, "Error committing tasks.", e);
    }
};

/**
 * Fires when the server receives a request.
 * @param req HTTP Request.
 * @param res HTTP Response.
 */
GitTaskServer.prototype.requestReceived = function(req, res) {
    console.log("");
    var parsedUrl = url.parse(req.url);
    if (parsedUrl.pathname == null ||
        !parsedUrl.pathname.startsWith("/tasks/")) {
        server.serveFile(res, parsedUrl.pathname);
        return;
    }

    var data = "";
    req.on("data", function(chunk) {
        data += chunk;
    }).on("end", function() {
        console.log("%s: %s", req.method, parsedUrl.pathname);
        switch (req.method) {
            case 'POST':
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    server.reportError(res, 'Error parsing JSON.', e);
                    return;
                }
                if (parsedUrl.pathname == "/tasks/commit") {
                    server.commit(data.msg, res);
                    return;
                }
                server.postItem(data, res);
                break;

            case 'GET':
                server.getItems(res);
                break;

            case 'DELETE':
                server.deleteItem(parsedUrl.pathname.substr("/tasks/".length + 1).trim(), res);
                break;
        }
    });
};

/**
 * Runs the git-task server.
 */
GitTaskServer.prototype.run = function() {
    var config = require(git.taskDir + path.sep + "config.js");
    var server = http.createServer(this.requestReceived);

    server.listen(config.port, config.bindAddress, function() {
        var pidFile = git.taskDir + path.sep + "server.pid";
        console.log('Server is now listening on %s:%d...', config.bindAddress, config.port);
        fs.writeFileSync(pidFile, process.pid);

        process.on('SIGTERM', function() {
            console.log('Got SIGTERM signal. Exiting');
            fs.unlinkSync(pidFile);
            process.exit(0);
        });
    });
};

var server = new GitTaskServer();

//NOTICE: Do not modify from this point.
if (typeof module !== 'undefined')
    module.exports = server;