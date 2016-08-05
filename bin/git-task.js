/**
 * Created by jeff on 5/08/16.
 */

const fs = require('fs');
const child_process = require('child_process');
const path = require('path');
var argv = require('./argv');
var ncp = require('./ncp').ncp;

const DEFAULT_TEMPLATE_DIR = "/usr/share/git-task/project-template";

var taskInitModuleOptions = {
    mod: 'init',
    description: 'Init a git task-enabled repository.',
    options: [
        {
            name: 'template-dir',
            short:'t',
            type: 'string',
            description: 'Project template directory. (Default: ' + DEFAULT_TEMPLATE_DIR + ')',
            example: "git task init --template-dir /home/user/mytemplatedir"
        },
        {
            name: 'server',
            short:'s',
            type: 'boolean',
            description: 'After initialization, the server is started. (Default: false)',
            example: "git task init --server"
        }
    ]
};

var taskAddModuleOptions = {
    mod: 'add',
    description: 'Add a new task.',
    options: [
    ]
};

var taskStartModuleOptions = {
    mod: 'start',
    description: 'Start the git-task service.',
    options: [
    ]
};

var taskStopModuleOptions = {
    mod: 'stop',
    description: 'Stop the git-task service.',
    options: [
    ]
};

var allModules = [taskAddModuleOptions, taskInitModuleOptions, taskStartModuleOptions, taskStopModuleOptions];

/**
 * Gets the git repository base dir.
 */
function getRepoDir() {
    try {
        var repoDir = child_process.execSync('git rev-parse --show-toplevel');
        return repoDir.toString().trim();
    } catch (e) {
        return null;
    }
}

/**
 * Add a path to git.
 */
function gitAdd(path) {
    try {
        console.log(child_process.execSync('git add "' + path + '"').toString().trim());
    } catch (e) {
        console.error("Error running git. Exiting.");
        process.exit(1);
    }
}

/**
 * Copies the templateDir to the git-task folder in the repoDir.
 * @param templateDir Template directory.
 * @param taskDir git-task repository directory.
 * @returns {*}
 */
function copyTemplateDir(templateDir, taskDir) {
    try {
        if (!fs.existsSync(taskDir)) {
            fs.mkdirSync(taskDir);
        }
        ncp(templateDir, taskDir, function(err) {
            if (err) {
                console.error(err);
            }
        });
    } catch (e) {
        console.error("Cannot create directory " + taskDir + ". " + e + ". Exiting.");
        process.exit(1);
    }
}

/**
 * Inits a git-task enabled repository.
 * @param args Arguments.
 */
function taskInit(args) {
    var currentOption = null;
    var templateDir = DEFAULT_TEMPLATE_DIR;
    if (args.options["template-dir"] != null) {
        templateDir = args.options["template-dir"];
    }
    var runServer = args.options["server"] ? args.options["server"] : false;
    var repoDir = getRepoDir();
    if (repoDir == null) {
        console.error('Repository directory not accessible. Exiting.');
        process.exit(1);
    }
    var taskDir = repoDir + path.sep + ".tasks";
    console.log("Deploying git-task directory to %s.", taskDir);
    copyTemplateDir(templateDir, taskDir);
    gitAdd(taskDir);
}

String.prototype.quote = function(sym) {
    if (!sym) {
        sym = '"';
    }
    return sym + this + sym;
};

/**
 * Start the git-task server.
 * @param args Arguments.
 */
function taskStart(args) {
    var taskDir = repoDir + path.sep + ".tasks";
    try {
        var nodeExe = process.argv[0];
        var serverPath= taskDir + path.sep + "server.js";
        var serverLog = taskDir + path.sep + "server.log";
        var out = fs.openSync(serverLog, 'a');
        var err = fs.openSync(serverLog, 'a');
        var serverProcess = child_process.spawn(nodeExe, [serverPath], {
            detached: true,
            stdio: [ 'ignore', out, err ]
        });
        serverProcess.unref();
    } catch (e) {
        console.error("Error starting server. Exiting. " + e);
        process.exit(1);
    }
}

/**
 * Stop the git-task server.
 * @param args Arguments.
 */
function taskStop(args) {
    var taskDir = repoDir + path.sep + ".tasks";
    var pidFile = taskDir + path.sep + "server.pid";
    if (!fs.existsSync(pidFile)) {
        console.error('Server pid file "%s" does not exist. Exiting.', pidFile);
        process.exit(1);
    }
    var processPid = fs.readFileSync(pidFile);
    try {
        process.kill(processPid);
    }
    catch (e) {
        console.error('Error stopping server. Exiting.' + e);
        process.exit(1);
    }
}

/**
 * Adds a task.
 * @param args
 */
function taskAdd(args) {

}

/**
 * Runs the task command.
 */
function run() {
    argv.version('v0.1.0');
    allModules.forEach(function (m) {
        argv.mod(m);
    });
    var args = argv.run();
    switch (args.mod) {
        case 'init':
            taskInit(args);
            break;
        case 'start':
            taskStart(args);
            break;
        case 'stop':
            taskStop(args);
            break;
    }
}

var repoDir = getRepoDir();
run();
