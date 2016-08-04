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
    if (fs.existsSync('data')) {
        return;
    }
    fs.mkdirSync('data');
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
 * Saves the object to a file.
 * @param obj
 */
function saveObjectToFile(obj) {
    checkDataDir();
    var fileName = "data" + path.sep + obj.id;
    fs.writeFileSync(fileName, JSON.stringify(obj, null, 2));
    console.info("File '%s' created.", fileName);
    gitAdd(fileName);
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
        "status":"success",
        "obj": obj
    };
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
    try {
        saveObjectToFile(parsedData);
    }
    catch (e) {
        return reportError(res, 'Error creating item.', e);
    }
    reportSuccess(res, parsedData);
}

/**
 * Gets the tasks items.
 * @param res HTTP response.
 */
function getItems(res) {
    try {
        checkDataDir();
        var files = fs.readdirSync('data');
        var items = [];
        files.forEach(function (item) {
            try {
                var fileContent = fs.readFileSync('data' + path.sep + item);
                items.push(JSON.parse(fileContent));
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
        }
    });
}

var server = http.createServer(requestReceived);

server.listen(config.port, config.bindAddress, function() {
    console.log('Server is now listening on %s:%d...', config.bindAddress, config.port);
});