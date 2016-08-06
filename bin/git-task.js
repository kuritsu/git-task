/**
 * Created by jeff on 5/08/16.
 */

const fs = require('fs');
const child_process = require('child_process');
const path = require('path');
var argv = require('./argv');
var ncp = require('./ncp').ncp;

const DEFAULT_TEMPLATE_DIR = "/usr/share/git-task/project-template";

const MODULE_OPTIONS_TASK_INIT = {
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

const MODULE_OPTIONS_TASK_ADD = {
    mod: 'add',
    description: 'Add a new task.',
    options: [
    ]
};

const MODULE_OPTIONS_TASK_COMMIT = {
    mod: 'commit',
    description: 'Commits only the content of the .tasks directory.',
    options: [
        {
            name: 'message',
            short:'m',
            type: 'string',
            description: '(Optional) The message for the commit.',
            example: "git task commit -m 'git task added!'"
        }
    ]
};

const MODULE_OPTIONS_TASK_START = {
    mod: 'start',
    description: 'Start the git-task service.',
    options: [
    ]
};

const MODULE_OPTIONS_TASK_STOP = {
    mod: 'stop',
    description: 'Stop the git-task service.',
    options: [
    ]
};

const ALL_MODULES = [MODULE_OPTIONS_TASK_ADD, MODULE_OPTIONS_TASK_COMMIT, MODULE_OPTIONS_TASK_INIT,
    MODULE_OPTIONS_TASK_START, MODULE_OPTIONS_TASK_STOP];

/**
 * Runs git.
 * @param args Git arguments (string).
 */
function git(args) {
    try {
        var output = child_process.execSync('git '+ args).toString().trim();
        console.log(output);
        return output
    } catch (e) {
        console.error("Error running git. Exiting." + e);
        process.exit(1);
    }
}

/**
 * Gets the git repository base dir.
 */
function getRepoDir() {
    return git('rev-parse --show-toplevel');
}

/**
 * Add a path to git.
 */
function gitAdd(path) {
    git('add "' + path + '"');
}

/**
 * Commits with git.
 */
function gitCommit(message) {
    var messageArg = "";
    if (message) {
        messageArg = "-m " + message.quote();
    }
    git('commit ' + messageArg);
}

/**
 * Stash with git.
 */
function gitStash(arg) {
    git('stash ' + arg);
}

/**
 * Git unstage file.
 */
function gitUnstage(path) {
    git('rm --cached -r "' + path + '"');
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
    var templateDir = DEFAULT_TEMPLATE_DIR;
    if (args.options["template-dir"] != null) {
        templateDir = args.options["template-dir"];
    }
    if (repoDir == null) {
        console.error('Repository directory not accessible. Exiting.');
        process.exit(1);
    }
    console.log("Deploying git-task directory to %s.", taskDir);
    copyTemplateDir(templateDir, taskDir);
    gitAdd(taskDir);

    var runServer = args.options["server"] ? args.options["server"] : false;
    if (runServer) {
        taskStart(args);
    }
}

/**
 * Commits only the contents of the .tasks directory.
 * @param args Arguments.
 */
function taskCommit(args) {
    var message = args.options["message"];
    gitUnstage(taskDir);
    gitStash('save');
    gitAdd(taskDir);
    gitCommit(message);
    gitStash('pop');
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
    try {
        var nodeExe = process.argv[0];
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
    ALL_MODULES.forEach(function (m) {
        argv.mod(m);
    });
    var args = argv.run();
    switch (args.mod) {
        case 'commit':
            taskCommit(args);
            break;
        case 'init':
            taskInit(args);
            break;
        case 'start':
            taskStart(args);
            break;
        case 'stop':
            taskStop(args);
            break;
        default:
            console.error("Error: command argument required.");
            console.log("Available commands: ");
            ALL_MODULES.forEach(function(module) {
                console.log("\t %s", module.mod);
            });
            process.exit(-1);
            break;
    }
}

var repoDir = getRepoDir();
var taskDir = repoDir + path.sep + ".tasks";
var pidFile = taskDir + path.sep + "server.pid";
var serverPath= taskDir + path.sep + "server.js";
var serverLog = taskDir + path.sep + "server.log";

run();
