/**
 * Created by jeff on 3/08/16.
 */

var tasks = [];
var draggedTask = null;

/**
 * Finds the container associated with an status.
 * @param status Status to search for.
 * @returns {*|{}} Container found (jQuery).
 */
function getContainerFor(status) {
    var result = $('.column_task_group[data-status="' + status + '"]');
    return result;
}

/**
 * Task class
 * @constructor
 */
function Task() {
    this.status = 'open';
    this.pending = 2;
    this.estimation = 2;
    this.title = 'New task';
    this.tags = '';
}

/**
 * Creates a new Task.
 * @returns {Task} New task.
 */
function createNewTask() {
    var newTask = new Task();
    return newTask;
}

/**
 * Find the task given its ID.
 * @param id Task ID.
 * @returns {*|{}} Task
 */
function findTask(id) {
    return tasks.find(function(item) {
        return item.id == id;
    });
}

/**
 * Finds a task item.
 * @param id Task ID.
 */
function findTaskItem(id) {
    return $('.task_item[data-id="' + id + '"]');
}

/**
 * Edits a task in a form.
 * @param task Task to edit.
 */
function editTask(task) {
    var keys = Object.keys(task);
    var containerForm = $(".task_editor_form");
    var content = '<table class="form_table" cellpadding="3" cellspacing="3">';
    var template =
        '<tr>' +
            '<td class="task_edit_form_keys_column">%key%: </td>' +
            '<td class="task_edit_form_values_column">' +
                '<input type="text" data-key="%key%" class="task_edit_input" value="%value%" %attrs% />' +
            '</td>' +
        '</tr>';
    keys.sort();
    keys.forEach(function(key) {
        var attrs = "";
        var encodedValue = task[key];
        if (typeof encodedValue === 'string') {
            encodedValue = encodedValue.replaceAll('"', "&quot;").replaceAll("'", '&apos;');
        }
        if (key == "id") {
            attrs = "readonly";
        }
        content += template.format(["%key%", "%value%", "%attrs%"], [key, encodedValue, attrs]);
    });
    content += '</table>';
    containerForm.html(content);
    var taskEditorPanel = $(".task_editor");
    taskEditorPanel.removeClass("hidden");
    $("#save_task_button").off("click").click(function(event) {
        event.preventDefault();
        containerForm.find("input").toArray().forEach(function(item) {
            var input = $(item);
            task[input.data("key")] = input.val();
        });
        updateTask(task);
        var taskItem = findTaskItem(task.id);
        addTask(task, taskItem);
    });

    $("#close_task_button").off("click").click(function(event) {
        event.preventDefault();
        taskEditorPanel.addClass("hidden");
    });
}

/**
 * Fires when the Edit task link is clicked.
 */
function taskItemEditClick(event) {
    var taskItem = $(event.target).parents(".task_item");
    var task = findTask(taskItem.data("id"));
    editTask(task);
}

/**
 * Adds a task to the corresponding status panel.
 * @param task Task to add.
 * @param prevItem If defined, must be the previous item (to replace with this new one).
 */
function addTask(task, prevItem) {
    if (tasks.indexOf(task) < 0) {
        tasks.push(task);
    }
    var itemTemplate =
        '<div class="task_item %git%" draggable="true" data-id="%id%">' +
            '<span class="task_item_title">%title%</span><br/>' +
            '<span class="task_item_pending">%pending%</span>h / ' +
            '<span class="task_item_estimated">%estimation%</span>h<br/>' +
            '<span class="task_item_tags">%tags%</span>' +
            '<div class="task_options">' +
                '<a class="edit_task_link" href="#">E</a> ' +
                '<a class="task_menu_link" href="#">M</a>' +
            '</div>' +
        '</div>';
    var tags = (!task.tags || task.tags.isWhitespace()) ?
        "<em>[no tags]</em>" : task.tags;
    var git = "";
    switch (task.gitStatus) {
        case 'A ':
            git = "added";
            break;
        case ' M':
            git = "modified";
            break;
    }
    var realItem = itemTemplate.format(
        ["%id%","%title%","%pending%","%estimation%","%tags%", "%git%"],
        [task.id, task.title, task.pending, task.estimation, tags, git]);
    var container = getContainerFor(task.status);
    if (container.length == 0) {
        return;
    }
    var replaced = false;
    if (prevItem != null && prevItem.length == 1) {
        var prevParent = prevItem.parent(".column_task_group");
        if (prevParent.data("status") == container.data("status")) {
            prevItem.replaceWith(realItem);
            replaced = true;
        } else {
            prevItem.remove();
        }
    }
    if (!replaced) {
        container.append(realItem);
    }
    var newChildNode = container.children('.task_item[data-id="' + task.id + '"]');
    newChildNode.on("dragstart", function (event) {
        draggedTask = $(event.target);
    });
    newChildNode.find(".task_item_title").click(taskItemTitleClick);
    newChildNode.find(".task_item_tags").click(taskItemTagsClick);
    newChildNode.find(".edit_task_link").click(taskItemEditClick);
    newChildNode.find(".task_menu_link").click(taskItemMenuLinkClick);
}

/**
 * Gets the base service URL.
 * @returns {string} Base service URL.
 */
function getBaseUrl() {
    var url = "http://".concat(config.bindAddress, ":",
        config.port.toString(), "/tasks/");
    return url;
}

/**
 * Edit the task title.
 * @param task Task to edit.
 */
function editTaskTitle(task) {
    var taskDiv = $('.task_item[data-id="' + task.id + '"]');
    var taskTitleLabel = taskDiv.children(".task_item_title");
    taskTitleLabel.click();
}

/**
 * Fires when the New task button is clicked.
 */
function newTaskClick() {
    event.preventDefault();
    var url = getBaseUrl();
    var newTask = createNewTask();
    $.post(url, JSON.stringify(newTask), function(res) {
        addTask(res.obj);
        if (!$(".task_editor").hasClass("hidden")) {
            editTask(res.obj);
            return;
        }
        editTaskTitle(res.obj);
    }).fail(function(error){
        alert("error:" + JSON.stringify(error));
    });
}

/**
 * Updates a task info on the server.
 */
function updateTask(task) {
    var url = getBaseUrl();
    $.post(url, JSON.stringify(task), function(res) {
        handleSuccess('Task updated.');
    }).fail(function(error){
        handleError(error);
    });
}

/**
 * Edits a value in-line (in the task item).
 * @param labelElement Label element to be replaced.
 * @param taskProperty Task property to set in the textbox.
 * @param clickHandler Function of the click event handler.
 * @param admitsWhitespace Indicates if the textbox admits whitespace or empty string.
 * @param textBoxWidth Text box width.
 * @returns {*|jQuery|HTMLElement} Input element.
 */
function editInputInPlace(labelElement, taskProperty, clickHandler, admitsWhitespace, textBoxWidth) {
    if (typeof admitsWhitespace === 'undefined' || admitsWhitespace == null) {
        admitsWhitespace = true;
    }
    if (!textBoxWidth) {
        textBoxWidth = "150px";
    }
    labelElement.replaceWith(
        "<input class='visible_text_edit' type='text' style='width: %width%'/>".format(["%width%"], [textBoxWidth]));
    var inputEdit = $(".visible_text_edit");
    var parent = inputEdit.parent(".task_item");
    var currentTask = tasks.find(function(item) {
        return item.id == parent.data("id");
    });
    inputEdit.val(currentTask[taskProperty]);
    inputEdit.focus();
    inputEdit.focusingOut = false;
    inputEdit.on("focusout", function() {
        event.preventDefault();
        if (inputEdit.focusingOut) {
            return;
        }
        inputEdit.focusingOut = true;
        if (currentTask[taskProperty] != inputEdit.val() &&
            ((!admitsWhitespace && !inputEdit.val().isWhitespace()) || admitsWhitespace) ) {
            currentTask[taskProperty] = inputEdit.val();
            updateTask(currentTask);
        }
        labelElement.html(currentTask[taskProperty]);
        labelElement.click(clickHandler);
        inputEdit.replaceWith(labelElement);
    }).on("keypress", function() {
        if (event.keyCode == 13) {
            inputEdit.focusout();
        }
    });
    return inputEdit;
}

/**
 * Fires when the title of a task item is clicked.
 */
function taskItemTitleClick() {
    editInputInPlace($(this), "title", taskItemTitleClick, false);
}

/**
 * Fires when the tags of a task item is clicked.
 */
function taskItemTagsClick() {
    var label = $(this);
    var inputEdit = editInputInPlace($(this), "tags", taskItemTagsClick);
    inputEdit.on("focusout", function() {
        var taskItem = label.parent(".task_item");
        var task = findTask(taskItem.data("id"));
        if (task.tags.isWhitespace()) {
            label.html("<em>[no tags]</em>");
        }
    });
}

/**
 * Deletes a task.
 * @param taskId Task ID.
 */
function deleteTask(taskId) {
    $.ajax(getBaseUrl() + "/" + taskId, {
        method: "DELETE",
        success: function(data) {
            if (data.status == "success") {
                handleSuccess('Task deleted.');
                var taskItem = findTaskItem(taskId);
                taskItem.remove();
            }
            else {
                handleError("Error deleting task: " + data.msg);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            handleError("Error deleting task: " + textStatus);
        }
    });
}

/**
 * Fires when the link of the task menu is clicked.
 * @param event
 */
function taskItemMenuLinkClick(event) {
    event.preventDefault();
    var menuLink = $(event.target);
    var taskItem = menuLink.parents(".task_item");
    var taskId = taskItem.data("id");
    var taskMenu = $("#task_menu");
    var task = findTask(taskId);
    taskMenu.data("id", taskId);
    taskMenu.css("top", taskItem.offset().top + taskItem.height() - 10);
    taskMenu.css("left", taskItem.offset().left + taskItem.width() - 10);
    taskMenu.removeClass("hidden");

    var includeInCommit = $("#include_commit_task_menu_item");
    var excludeFromCommit = $("#exclude_commit_task_menu_item");
    if (task.gitStatus == '??') {
        includeInCommit.removeClass('hidden');
        excludeFromCommit.addClass('hidden');
    } else {
        excludeFromCommit.removeClass('hidden');
        includeInCommit.addClass('hidden');
    }
}

/**
 * Handles an error occurred in the app.
 * @param error Error (exception).
 */
function handleError(error) {
    var errorPanel = $(".error_message");
    errorPanel.html(error);
    errorPanel.removeClass('hidden');
    errorPanel.fadeIn(200, function() {
        errorPanel.fadeOut(3000, function() {
        });
    });
}

/**
 * Handles a successful operation.
 * @param message Message to show.
 */
function handleSuccess(message) {
    var successPanel = $(".success");
    successPanel.html(message);
    successPanel.removeClass('hidden');
    successPanel.fadeIn(200, function() {
        successPanel.fadeOut(3000, function() {
        });
    });
}

/**
 * Load the tasks from the service.
 */
function loadTasks() {
    $(".loading").removeClass('hidden');
    var url = getBaseUrl();
    $.get(url, function(data) {
        if (data.status == "success") {
            data.obj.forEach(function(item) {
                if (typeof item.tags === 'undefined')
                    item.tags = '';
                addTask(item);
            });
            $(".loading").addClass('hidden');
        }
    }).fail(function(error) {
        handleError(error);
    });
}

/**
 * Creates panels for each task status.
 */
function createTaskStatusPanels() {
    var statuses = ["open", "in_progress", "done"];
    var panelTemplate =
            '<td class="column_task_group back%index%" data-status="%status%">' +
                '<div class="column_header">%status%</div>' +
            '</td>';
    var content = "<table width='100%'><tr>";
    statuses.forEach(function(item, index) {
        content += panelTemplate.format(["%status%", "%index%"], [item, index.toString()]);
    });
    content += "</tr></table>";
    var container = $("#task_container");
    container.html(content);
    container.on("dragover", function (event) {
            event.preventDefault();
        })
        .on("drop", function (event) {
            event.preventDefault();
            var taskItem = draggedTask;
            var target = $(event.target);
            if (!target.hasClass("column_task_group")) {
                target = target.parent(".column_task_group");
            }
            var parent = taskItem.parent('.column_task_group');
            if (parent.data("status") == target.data("status")) {
                return;
            }
            //taskItem.remove();
            target.append(taskItem);
            var task = findTask(taskItem.data("id"));
            task.status = target.data("status");
            updateTask(task);
        });
}

/**
 * Filter task display by a value.
 * @param value Space separated values.
 */
function filterTasksBy(value) {
    $(".task_item").addClass("hidden");
    var terms = value.split(" ");
    tasks.forEach(function(task) {
        var text = JSON.stringify(task);
        terms.forEach(function(term) {
            if (text.indexOf(term) >= 0) {
                $('.task_item[data-id="' + task.id + '"]').removeClass("hidden");
            }
        });
    });
}

/**
 * Register event on textbox filter.
 */
function registerFilterEvents() {
    var searchTextbox = $("#search_textbox");
    searchTextbox.keyup(function(event) {
        var value = searchTextbox.val();
        filterTasksBy(value);
    });
}

/**
 * Register a click event in the document to enable hiding the task context menu.
 */
function registerTaskMenuHideEvent() {
    $(document).click(function(event) {
        var target = $(event.target);
        var taskMenu = $("#task_menu");
        if (target.attr("id") != "task_menu" &&
            !target.hasClass("task_menu_link") &&
            !taskMenu.hasClass("hidden")) {
            taskMenu.addClass("hidden");
        }
    });
}

/**
 * Unstages a task from git.
 * @param taskId Task ID.
 */
function unstageTask(taskId) {
    var task = findTask(taskId);
    var taskItem = findTaskItem(taskId);
    task.gitStatus = '??';
    updateTask(task);
    addTask(task, taskItem);
}

/**
 * Stages a task in git.
 * @param taskId Task ID.
 */
function stageTask(taskId) {
    var task = findTask(taskId);
    var taskItem = findTaskItem(taskId);
    task.gitStatus = 'A ';
    updateTask(task);
    addTask(task, taskItem);
}

/**
 * Register the clicks of the task context menu items.
 */
function registerTaskContextMenuEvents() {
    $("#edit_task_menu_item").click(function(event) {
        var taskId = $("#task_menu").data("id");
        var task = findTask(taskId);
        editTask(task);
    });

    $("#include_commit_task_menu_item").click(function(event) {
        var taskId = $("#task_menu").data("id");
        stageTask(taskId);
    });

    $("#exclude_commit_task_menu_item").click(function(event) {
        var taskId = $("#task_menu").data("id");
        unstageTask(taskId);
    });

    $("#delete_task_menu_item").click(function(event) {
        var taskId = $("#task_menu").data("id");
        deleteTask(taskId);
    });
}

function registerTaskEditorButtonEvents() {

}

$(document).ready(function() {
    createTaskStatusPanels();
    loadTasks();
    registerFilterEvents();
    registerTaskMenuHideEvent();
    registerTaskContextMenuEvents();
    registerTaskEditorButtonEvents();
    $("#new_task_button").click(newTaskClick);
});