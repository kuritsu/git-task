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
 * Create form for editing a task.
 */
function taskItemEditClick(event) {
    var taskItem = $(event.target).parents(".task_item");
    var task = findTask(taskItem.data("id"));
    var keys = Object.keys(task);
    var template = '<tr><td align="right">%key%: </td>' +
        '<td width="70%"><input type="text" data-key="%key%" value="%value%" %attrs% /></td></tr>';
    var content = '<br/>Edit task<br/><table class="form_table" cellpadding="3" cellspacing="3">';
    var container = $(".task_editor");
    keys.sort();
    keys.forEach(function(key) {
        var attrs = "";
        if (key == "id") {
            attrs = "readonly";
        }
        content += template.format(["%key%", "%value%", "%attrs%"], [key, task[key], attrs]);
    });
    content += '</table><input type="button" value="Save" id="save_task_button" />';
    content += '<input type="button" value="Close" id="close_task_button" />';
    container.html(content);
    container.removeClass("hidden");

    $("#save_task_button").click(function(event) {
        container.find("input").toArray().forEach(function(item) {
            var input = $(item);
            task[input.data("key")] = input.val();
        });
        updateTask(task);
        addTask(task, taskItem);
        container.addClass("hidden");
    });

    $("#close_task_button").click(function(event) {
       container.addClass("hidden");
    });
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
        '<div class="task_item" draggable="true" data-id="%id%">' +
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
    var realItem = itemTemplate.format(
        ["%id%","%title%","%pending%","%estimation%","%tags%"],
        [task.id, task.title, task.pending, task.estimation, tags]);
    var container = getContainerFor(task.status);
    if (container.length == 0) {
        return;
    }
    var replaced = false;
    if (prevItem != null) {
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
    var url = getBaseUrl();
    var newTask = createNewTask();
    $.post(url, JSON.stringify(newTask), function(res) {
        addTask(res.obj);
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
 * Handles an error occurred in the app.
 * @param error Error (exception).
 */
function handleError(error) {
    alert("Error: " + error.stringify());
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

$(document).ready(function() {
    createTaskStatusPanels();
    loadTasks();
    registerFilterEvents();
    $("#new_task_button").click(newTaskClick);
});