# git-task

Manage tasks with a local website in a Git repository and a git command line extension.

## Why?

- Offline management of tasks related to a project.
- Tasks are inside the same git repository.
- Tasks are each a plain text JSON file, friendly format for reading, merging, or even changing.
- Ensure that every time you commit, the tasks changed are also included in the commit. Thus, no need for 
associating tasks and commits manually. Of course, multiple tasks can be included in a single commit.
- Provide a standardized way for the automation of task processing.
- Provide git extensions for task management.
- Synchronize tasks with online issue trackers (GitHub, JIRA, Trello, VS Team System, etc). *Coming soon!*

## Getting started

### Installation

git-task requires [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) (recommended v.4.4.7 or greater), 
but an Internet connection or *npm* repository is not need, since you can copy the git-task package in a compressed 
file from somebody else, for example.

#### Via GitHub

Clone the git-task GitHub repository (or download the [zip file](http://github.com/kuritsu/git-task/archive/master.zip)): 

``` bash
$ git clone https://github.com/kuritsu/git-task
```

And then:

#### Via NPM 
  
Run *npm* from the folder of your git repository (or use *-g* if you want it globally installed - see
```npm help install``` for more details):

``` bash
$ npm install git-task
```

or

``` bash
$ npm install git_task_folder
```

or
 
``` bash
$ npm install git-task.tar.gz
```

### Enable a git-task repository

#### Setting the environment

##### Linux/iOS:

Locate the git-task Node.js script either in:

- The Node.js locally installed modules: /path/to/your/project/node_modules/git-task/bin
 
or 

- The global Node.js modules: /path/to/your/nodejs/home/lib/node_modules/git-task/bin

Then include that directory in your PATH environment variable (i.e., use ```export PATH=$PATH:path_to_git_task_script_dir```
in a Bash session or add it in your *~/.bashrc* or *~/.profile* files and then reopen a shell session).

##### Windows:

*Comming soon!*

#### Run git-task init

Now you should be able to run at your git repository:

``` bash
$ git-task init
```

or for a more git-like alternative: 

``` bash
$ git task init
```

This command copies all the git-task required files to a *.task* directory under your git repository. 
Then, run the following command for starting the git-task server (website hosting service):

``` bash
$ git task start
```

By default, as you can see in *.tasks/config.js*, the hosted service starts at *http://localhost:16100*.
You can change this by modifying that file.

**NOTICE:** This must be done in a git-enabled folder. If no valid .git directory is found, the git-task commands
will fail.

Open a web browser and enter the site address: *http://localhost:16100*. You should see a web page like this:

<img src="images/screenshot1.png" alt="git-task web page" />

You can stop the server executing:

``` bash
$ git task stop
```

By default the PID (process ID) of the running server is stored in the *.tasks/server.pid* file, and you can view 
the server log at *.tasks/server.log*.

### Creating tasks

Click the *New task* link. A new task is created and you can edit its title. Press Enter or 
click outside the task to stop editing.

### Modifying tasks

Click the title, pending, estimation hours or tag labels to edit them directly in the 
task item. Click the *E* link in a task item to display a task editor.
 
### Deleting tasks

Click the *M* link and select the *Delete task* option. The task should now be deleted - thus, the file doesn't
exist and will not be included in a commit.

### Git status of tasks

Each task is painted with a specific background color. Read the end of the page for knowing what each color means. 
By default:

- <span style="background-color:#b8fffa">Light blue</span>: Unchanged (no addition or modifications).
- <span style="background-color:#fffc51">Yellow</span>: Added (added to git - not still committed).
- <span style="background-color:#ff9270">Light red</span>: Modified (already exists in the git repository, and it has 
been modified).
- <span style="background-color:#20B2AA">Green</span>: Not included (can be unchanged, added or modified, 
but it is NOT included in the commit).  

### Commit

You can commit all the project using ```git commit``` from a shell standing at the git repository or 
using an IDE. The tasks you modified or added should already be included in the commit.

You can also commit only the *.tasks* folder (to either commit the git-task site's code, styles or just the tasks 
themselves). This is done by clicking the "Commit" link at the menu bar. A dialog is shown to allow you 
include a commit message. 
  
### Excluding tasks from commit

You can exclude one or several tasks you added/modified from a commit. Click in the *M* link 
of the task item and select *Exclude from commit*. The task should have a different color now.

Choose *Include in commit* to undo this operation.

### Discarding changes in tasks

Changes in tasks can be discarded from git after you click the *M* link of the task and choose *Discard changes*.
The task will lose all the changes you made and restore it (via git checkout).

### Filtering tasks

Write a text in the *Filter / search here* textbox to filter the tasks shown in the page. All task attributes are 
included in the filter (ids, title, tags, etc). 

### Mass-adding and mass-removing tags

**NOTICE**: Mass-adding and mass-removing tags affect all tasks displayed in the page. Don't use this feature 
unless you filter the tasks before. 

Tags can be added or removed from a set of (or all) tasks. Type a tag name in the *tag1,tag2,-tag3,-tag4* textbox
and press Enter to add the task. Prepend the tag name with a *-* to remove the tag. When you press Enter all 
visible tasks are modified with the new tags added or removed. This causes the tasks to be updated (changed in git).

## Bugs

Enter [git-task issues](http://github.com/kuritsu/git-task/issues) or use git-task locally and push the code!!! 

## License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.