/**
 * Created by jeff on 3/08/16.
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const child_process = require('child_process');

require('./common.js');
const config = require('./config.js');

/**
 * Gets content type from file name.
 * @param fileName File name.
 */
function getContentTypeFromFileName(fileName) {
    if (fileName.endsWith('.css')) {
        return "text/css";
    }
    if (fileName.endsWith('.js')) {
        return "text/javascript";
    }
    return "text/html";
}

/**
 * Creates a digest (base64 id) for an item.
 * @returns {*} Item ID.
 */
function createItemId() {
    var hmac = crypto.createHmac('sha256', Date.now().toString());
    return hmac.digest('hex');
}

/**
 * Ensures the data dir is created.
 */
function checkDataDir() {
    if (fs.existsSync(dataDir)) {
        return;
    }
    fs.mkdirSync(dataDir);
}

/**
 * Adds a file to the git repository.
 * @param fileName File name.
 */
function gitAdd(fileName) {
    console.info('Calling git: ');
    child_process.exec('git add --verbose ' + fileName, function(error, stdout, stderr) {
        console.log(stdout.toString());
        if (stderr.length > 0) {
            console.error(stderr.toString());
        }
    });
}

/**
 * Removes a file from git and delete it.
 * @param fileName File name.
 */
function gitRm(fileName) {
    console.info('Calling git: ');
    child_process.execSync('git rm --force "' + fileName + '"');
}

/**
 * Unstages a file from git.
 * @param fileName File name.
 */
function gitUnstage(fileName) {
    console.info('Calling git: ');
    child_process.execSync('git reset HEAD "' + fileName + '"');
}

/**
 * Gets the git status for task items.
 * @returns {*} String of the git status such as:
 * A  .tasks/data/0ae54bd852ad6a68481f0884f04c4f13ff79b98623cd0f9615300aaa0794c71e
 *  M .tasks/data/1ad8a826fa0c95d0f3a087740499eea51dfa9bb043cd8613f40bf7f0e99dcf87
 * ?? .tasks/data/b82c194529c8918d3f175462339c082174379cc668c2dd75ac1a2430714e4ae0
 * Where A is added, M is modified, R is renamed, D deleted and ?? is untracked
 */
function gitGetTaskStatus() {
    console.info('Calling git: ');
    var status = child_process.execSync('git status --porcelain "' + dataDir + '"').toString();
    console.log(status);
    return status;
}

/**
 * Saves the object to a file.
 * @param obj Object to save.
 */
function saveObjectToFile(obj) {
    checkDataDir();
    var fileName = dataDir + path.sep + obj.id;
    fs.writeFileSync(fileName, JSON.stringify(obj, null, 2));
    console.info("File '%s' created.", fileName);
    if (obj.gitStatus == '??') {
        gitUnstage(fileName);
    } else {
        gitAdd(fileName);
    }
}

/**
 * Serves a file directly to the browser.
 * @param res HTTP Response
 * @param pathname Path name of the URL
 */
function serveFile(res, pathname) {
    var fileName = pathname == null || pathname == "/"
        ? "tasks.html" : pathname;
    fileName = path.sep != '/' ?
        fileName.replaceAll('/', path.sep) : fileName;
    fileName =  __dirname + path.sep + fileName;
    console.log('Retrieving file %s.', fileName);
    if (!fs.existsSync(fileName)) {
        res.writeHead(500, {});
        console.error("Invalid access to file '%s'.", fileName);
        res.end("");
        return;
    }
    res.writeHead(200, {'Content-type': getContentTypeFromFileName(fileName)});
    var fileContent = fs.readFileSync(fileName);
    res.end(fileContent);
}

/**
 * Reports successful response with an object.
 * @param response HTTP response.
 * @param obj Object to return.
 */
function reportSuccess(response, obj) {
    response.writeHead(200, {'Content-type': 'application/json'});
    var responseBody = {
        "status":"success"
    };
    if (obj) {
        responseBody.obj = obj;
    }
    response.end(JSON.stringify(responseBody));
}

/**
 * Reports an error as a json response.
 * @param response HTTP response.
 * @param errorMessage Error message.
 * @param exception Exception if needs saving to the log.
 */
function reportError(response, errorMessage, exception) {
    if (exception) {
        console.error(JSON.stringify(exception));
    }
    response.writeHead(500, {'Content-type': 'application/json'});
    var responseBody = {
        "status":"error",
        "msg": errorMessage
    };
    response.end(JSON.stringify(responseBody));
}

/**
 * Processes a POST request.
 * @param data Data received.
 * @param res HTTP Response.
 */
function postItem(data, res) {
    var parsedData = JSON.parse(data);
    if (!parsedData.id) {
        parsedData.id = createItemId();
    }
    if (!parsedData.createdAt) {
        parsedData.createdAt = Date.now();
    }
    parsedData.updatedAt = Date.now();
    try {
        saveObjectToFile(parsedData);
    }
    catch (e) {
        return reportError(res, 'Error creating item.', e);
    }
    reportSuccess(res, parsedData);
}

/**
 * Updates the status in git of a task.
 * @param task Task to update.
 * @param gitStatusList Status list from git.
 */
function updateTaskGitStatus(task, gitStatusList) {
    task.gitStatus = '??';
    if (typeof task.id !== 'string')
        return;
    gitStatusList.forEach(function(item) {
        if (item.endsWith(path.sep + task.id)) {
            task.gitStatus = item.substr(0, 2);
        }
    });
}

/**
 * Gets the tasks items.
 * @param res HTTP response.
 */
function getItems(res) {
    try {
        checkDataDir();
        var files = fs.readdirSync(dataDir);
        var items = [];
        var gitStatusList = gitGetTaskStatus().split('\n');
        files.forEach(function (item) {
            try {
                var fileContent = fs.readFileSync(dataDir + path.sep + item);
                var task = JSON.parse(fileContent);
                updateTaskGitStatus(task, gitStatusList);
                items.push(task);
            } catch (e) {
                console.error("Error reading file '%s'. %s", item, JSON.stringify(e));
            }
        });
        reportSuccess(res, items);
    } catch (e) {
        reportError(res, "Error reading tasks.", e);
    }
}

/**
 * Delete a task item.
 * @param itemId Item ID.
 * @param res HTTP Response.
 */
function deleteItem(itemId, res) {
    console.log('Deleting task %s.', itemId);
    try {
        gitRm(dataDir + path.sep + itemId);
        reportSuccess(res);
    }
    catch (e) {
        reportError(res, "Error deleting task.");
    }
}

/**
 * Fires when the server receives a request.
 * @param req HTTP Request.
 * @param res HTTP Response.
 */
function requestReceived(req, res) {
    console.log("");
    var parsedUrl = url.parse(req.url);
    if (parsedUrl.pathname == null ||
        !parsedUrl.pathname.startsWith("/tasks/")) {
        serveFile(res, parsedUrl.pathname);
        return;
    }

    var data = "";
    req.on("data", function(chunk) {
        data += chunk;
    }).on("end", function() {
        switch (req.method) {
            case 'POST':
                postItem(data, res);
                break;

            case 'GET':
                getItems(res);
                break;

            case 'DELETE':
                deleteItem(parsedUrl.pathname.substr("/tasks/".length + 1).trim(), res);
                break;
        }
    });
}

var dataDir = __dirname + path.sep + 'data';
var server = http.createServer(requestReceived);

server.listen(config.port, config.bindAddress, function() {
    var pidFile = __dirname + path.sep + "server.pid";
    console.log('Server is now listening on %s:%d...', config.bindAddress, config.port);
    fs.writeFileSync(pidFile, process.pid);

    process.on('SIGTERM', function() {
        console.log('Got SIGTERM signal. Exiting');
        fs.unlinkSync(pidFile);
        process.exit(0);
    });
});