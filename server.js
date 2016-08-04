/**
 * Created by jeff on 3/08/16.
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
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
 * Replaces all text ocurrences in a string.
 * @param whichText String: Text to find.
 * @param withText String: Text to replace with.
 */
String.prototype.replaceAll = function(whichText, withText) {
    var inText = this.toString();
    while (inText.indexOf(whichText) >= 0) {
        inText = inText.replace(whichText, withText);
    }
    return inText;
};

/**
 * Indicates if a string starts with a text or not.
 * @param text Text to analyse.
 * @returns {boolean} True if the string starts with the text, false if not.
 */
String.prototype.startsWith = function(text) {
    return text != null && this.indexOf(text) == 0;
};

/**
 * Indicates if a string ends with a text or not.
 * @param text Text to analyse.
 * @returns {boolean} True if the string ends with the text, false if not.
 */
String.prototype.endsWith = function(text) {
    return text != null && this.lastIndexOf(text) == this.length - text.length;
};

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
        console.log("Invalid access to file '%s'.", fileName);
        res.end("");
        return;
    }
    res.writeHead(200, {'Content-type': getContentTypeFromFileName(fileName)});
    var fileContent = fs.readFileSync(fileName);
    res.end(fileContent);
}

var server = http.createServer(function(req, res) {
    var parsedUrl = url.parse(req.url);
    if (parsedUrl.pathname == null ||
        !parsedUrl.pathname.startsWith("/tasks/")) {
        serveFile(res, parsedUrl.pathname);
        return;
    }

    if (parsedUrl.search == null) {
        res.end('{status:"error", msg:"Invalid request."}');
        return;
    }
    var qs = querystring.parse(parsedUrl.search.substring(1));
    console.log(qs);
    res.end('OK');
});

server.listen(config.port, config.bindAddress, function() {
    console.log('Server is now listening on %s:%d...', config.bindAddress, config.port);
});