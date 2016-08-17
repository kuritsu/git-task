/**
 * Created by jeff on 5/08/16.
 */

const fs = require('fs');
const child_process = require('child_process');
const path = require('path');

var argv = require('./argv');
var ncp = require('./ncp').ncp;
const git = require('./git');
require('./common');
var server = require('./server');

const DEFAULT_TEMPLATE_DIR = path.normalize(__dirname + path.sep + ".." + path.sep + "site");

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
        {
            name: 'property',
            short:'p',
            type: 'list',
            description: '(Optional) Additional property to set for the new task.',
            example: 'git task add -p estimation:2 -p pending:2 "This is the new task"'
        }
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

const MODULE_OPTIONS_TASK_LIST = {
    mod: 'list',
    description: 'Show the list of tasks.',
    options: [
        {
            name: 'json',
            short:'j',
            type: 'boolean',
            description: '(Optional) JSON output.',
            example: "git task list --json dsckh32kuerf7e8wfhbu2yvrtyfgnerug9ni3dsfjdsfh2iu323r"
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

const ALL_MODULES = [
    MODULE_OPTIONS_TASK_ADD,
    MODULE_OPTIONS_TASK_COMMIT,
    MODULE_OPTIONS_TASK_INIT,
    MODULE_OPTIONS_TASK_LIST,
    MODULE_OPTIONS_TASK_START,
    MODULE_OPTIONS_TASK_STOP
];

/**
 * Represents the git-task cli.
 * @constructor
 */
function GitTaskCli() {
    this.taskDir = git.taskDir;
    this.pidFile = git.taskDir + path.sep + "server.pid";
    this.serverLog = git.taskDir + path.sep + "server.log";
}

/**
 * Tries to run a git command. If an error occurs, the process exits with 1.
 * @param fn Git function to execute.
 */
GitTaskCli.prototype.tryGit = function(fn) {
    try {
        fn();
    } catch (e) {
        console.error("Error running git. Exiting." + e);
        process.exit(1);
    }
};

/**
 * Copies the templateDir to the git-task folder in the repoDir.
 * @param templateDir Template directory.
 * @param taskDir git-task repository directory.
 */
GitTaskCli.prototype.copyTemplateDir = function(templateDir, taskDir) {
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
};

/**
 * Adds a task.
 * @param args Task arguments.
 */
GitTaskCli.prototype.taskAdd = function(args) {
    var props = args.options["property"];
    var task = { id: git.createItemId(), status: "open", createdAt: Date.now(), updatedAt: Date.now() };
    task.title = args.targets.join(" ");
    props.forEach(function(p) {
        var colonIndex = p.indexOf(':');
        if (colonIndex < 0) {
            return;
        }
        var key = p.substr(0, p.indexOf(':')).trim();
        var value = p.substr(colonIndex + 1).trim();
        task[key] = value;
    });
    server.saveObjectToFile(task);
};

/**
 * Inits a git-task enabled repository.
 * @param args Arguments.
 */
GitTaskCli.prototype.taskInit = function(args) {
    var th1s = this;
    var templateDir = DEFAULT_TEMPLATE_DIR;
    if (args.options["template-dir"] != null) {
        templateDir = args.options["template-dir"];
    }
    this.tryGit(function() {
        git.getRepoDir();
    });

    console.log("Deploying git-task directory '%s' to '%s'.", templateDir, this.taskDir);
    this.copyTemplateDir(templateDir, this.taskDir);
    this.tryGit(function () {
        git.gitAdd(th1s.taskDir);
    });

    var runServer = args.options["server"] ? args.options["server"] : false;
    if (runServer) {
        this.taskStart(args);
    }
};

/**
 * Replace the console info & log methods with stubs.
 */
GitTaskCli.prototype.replaceConsoleMethods = function() {
    this.consoleInfoMethod = console.info;
    this.consoleLogMethod = console.log;
    console.info = function() {};
    console.log = function() {};
};

/**
 * Restore the console info & log methods.
 */
GitTaskCli.prototype.restoreConsoleMethods = function() {
    console.info = this.consoleInfoMethod;
    console.log = this.consoleLogMethod;
};

/**
 * List the tasks.
 * @param args Command arguments.
 */
GitTaskCli.prototype.taskList = function(args) {
    var jsonOutput = args.options["json"];
    var ids = args.targets;
    var taskList = [];
    var th1s = this;
    this.replaceConsoleMethods();
    if (ids.length > 0) {
        ids.forEach(function(item) {
            try {
                taskList.push(server.readObjectFromFile(item));
            }
            catch (e) {
                console.error("Error reading task '%s'.", item);
            }
        });
    }
    else {
        taskList = server.readItems();
    }
    taskList.forEach(function(item, index) {
        if (jsonOutput) {
            if (index == 0) {
                th1s.consoleLogMethod("[");
            }
            th1s.consoleLogMethod(JSON.stringify(item, null, 2));
            if (index < taskList.length - 1) {
                th1s.consoleLogMethod(",");
            } else {
                th1s.consoleLogMethod("]");
            }
            return;
        }
        th1s.consoleLogMethod('id: "%s"', item.id);
        var keys = Object.keys(item).sort();
        keys.forEach(function(key) {
            if (key == 'id' || key == 'undefined') {
                return;
            }
            th1s.consoleLogMethod('%s: "%s"', key, item[key]);
        });
        if (index < taskList.length - 1) {
            th1s.consoleLogMethod("");
        }
    });
    this.restoreConsoleMethods();
};

/**
 * Commits only the contents of the .tasks directory.
 * @param args Arguments.
 */
GitTaskCli.prototype.taskCommit = function(args) {
    var message = args.options["message"];
    this.tryGit(function () {
        git.gitAdd(this.taskDir);
        git.gitCommit(message);
    });
};

/**
 * Start the git-task server.
 * @param args Arguments.
 */
GitTaskCli.prototype.taskStart = function(args) {
    try {
        var nodeExe = process.argv[0];
        var out = fs.openSync(this.serverLog, 'a');
        var err = fs.openSync(this.serverLog, 'a');
        var nodeArgs = [
            "-e",
            "require('git-task/lib/server').run();"
        ];
        console.log("Executing %s %s", nodeExe, nodeArgs.join(' '));
        var serverProcess = child_process.spawn(nodeExe, nodeArgs, {
            detached: true,
            env: process.env,
            stdio: [ 'ignore', out, err ]
        });
        serverProcess.unref();
    } catch (e) {
        console.error("Error starting server. Exiting. " + e);
        process.exit(1);
    }
};

/**
 * Stop the git-task server.
 * @param args Arguments.
 */
GitTaskCli.prototype.taskStop = function(args) {
    if (!fs.existsSync(this.pidFile)) {
        console.error('Server pid file "%s" does not exist. Exiting.', this.pidFile);
        process.exit(1);
    }
    var processPid = fs.readFileSync(this.pidFile);
    try {
        process.kill(processPid);
    }
    catch (e) {
        console.error('Error stopping server. Exiting.' + e);
        process.exit(1);
    }
};

/**
 * Runs the task command.
 */
GitTaskCli.prototype.run = function() {
    argv.version('v0.1.0');
    ALL_MODULES.forEach(function (m) {
        argv.mod(m);
    });
    var args = argv.run();
    switch (args.mod) {
        case 'add':
            this.taskAdd(args);
            break;
        case 'commit':
            this.taskCommit(args);
            break;
        case 'init':
            this.taskInit(args);
            break;
        case 'list':
            this.taskList(args);
            break;
        case 'start':
            this.taskStart(args);
            break;
        case 'stop':
            this.taskStop(args);
            break;
        default:
            console.error("Error: command argument required.");
            console.log("Available commands: ");
            ALL_MODULES.forEach(function(module) {
                console.log("\t %s: %s", module.mod, module.description);
            });
            process.exit(-1);
            break;
    }
};

//NOTICE: Do not modify from this point.
if (typeof module !== 'undefined')
    module.exports = new GitTaskCli();