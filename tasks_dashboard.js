/**
 * Created by jeff on 3/08/16.
 */

var tasks = [];

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
 * Adds a task to the corresponding status panel.
 * @param task Task to add.
 */
function addTask(task) {
    tasks.push(task);
    var itemTemplate =
        "<div class='task_item' draggable='true' data-id='%id%'>" +
            "<span class='task_item_title'>%title%</span><br/>" +
            "<span class='task_item_pending'>%pending%</span>h / " +
            "<span class='task_item_estimated'>%estimation%</span>h<br/>" +
            "<span class='task_item_tags'>%tags%</span>" +
        "</div>";
    var realItem = itemTemplate.format(
        ["%id%","%title%","%pending%","%estimation%","%tags%"],
        [task.id, task.title, task.pending, task.estimation, task.tags]);
    var container = getContainerFor(task.status);
    container.html(container.html() + realItem);
    $(".task_item_title").click(taskItemTitleClick);
    $(".task_item").on("drop", function(event) {
        var taskItem = $(this);
        var target = $(event.target);
        if (target.hasClass('column_task_group')) {
            taskItem.remove();
            target.appendChild(taskItem);
            var task = findTask(taskItem.data("id"));
            task.status = target.data("status");
        }
    });
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
 * Fires when the title of a task item is clicked.
 */
function taskItemTitleClick() {
    $(this).replaceWith("<input class='visible_text_edit' type='text'/>");
    var inputEdit = $(".visible_text_edit");
    var parent = inputEdit.parent(".task_item");
    var currentTask = tasks.find(function(item) {
        return item.id == parent.data("id");
    });
    inputEdit.val(currentTask.title);
    inputEdit.focus();
    inputEdit.on("focusout", function() {
        event.preventDefault();
        var parent = $(this).parent('.task_item');
        var titleTemplate = "<span class='task_item_title'>%title%</span>";
        var textInput = $(this);
        if (currentTask.title != textInput.val() && !textInput.val().isWhitespace() ) {
            currentTask.title = textInput.val();
            updateTask(currentTask);
        }
        var value = titleTemplate.format(["%title%"], [currentTask.title]);
        textInput.replaceWith(value);
        $(".task_item_title").click(taskItemTitleClick);
    }).on("keypress", function() {
        if (event.keyCode == 13) {
            $(this).focusout();
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
            '<div class="column_task_group back%index%" data-status="%status%">' +
                '<div class="column_header">%status%</div>' +
            '</div>';
    var content = "";
    statuses.forEach(function(item, index) {
        content += panelTemplate.format(["%status%", "%index%"], [item, index.toString()]);
    });
    $("#task_container").html(content);
}

$(document).ready(function() {
    createTaskStatusPanels();
    loadTasks();
    $("#new_task_button").click(newTaskClick);
});