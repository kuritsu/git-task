/**
 * Created by jeff on 3/08/16.
 */

/**
 * Replaces all text ocurrences in a string.
 * @param in_text String: Text to look into.
 * @param which_text String: Text to find.
 * @param with_text String: Text to replace with.
 */
function replace_all(in_text, which_text, with_text) {
    while (in_text.indexOf(which_text) >= 0) {
        in_text = in_text.replace(which_text, with_text);
    }
    return in_text;
}

/**
 * Applies a template to return a text with the variables substituted.
 * @param text_template Text template. Ex: This %var1% will show %var2%.
 * @param variables Array of variable names. Ex: ["%var1%","%var2%"].
 * @param values Array of variable values (in the same order of variables). Ex: ["algorithm", "nothing"].
 */
function template(text_template, variables, values) {
    variables.forEach(function(item, index) {
        text_template = replace_all(text_template, item, values[index]);
    });
    return text_template;
}

/**
 * Finds the container associated with an status.
 * @param status Status to search for.
 * @returns {*|{}} Container found (jQuery).
 */
function get_container_for(status) {
    var result = $('.column_task_group[data-status="' + status + '"]');
    return result;
}

$(document).ready(function() {

    $("#new_task_button").click(function() {
        alert("here");
        var url = "http://".concat(config.bindAddress, ":",
            config.port, "/tasks/");
        var data = {"req": "example"};
        $.post(url, JSON.stringify(data), function(res) {
            alert("got there!");
        }).fail(function(error){
            alert("error:" + JSON.stringify(error));
        });
    });

    var item_template =
        "<div class='task_item' draggable='true' data-id='%id%'>" +
            "%id% <br/>" +
            "<span class='task_item_title'>%title%</span><br/>" +
            "<span class='task_item_pending'>%pending%</span>" +
        "</div>";

    tasks.tasks.forEach(function(item) {
        var real_item = template(item_template,
            ["%id%","%title%","%pending%"],
            [item.id, item.title, item.pending]);
        var container = get_container_for(item.status);
        container.html(container.html() + real_item);
    });
    $(".task_item_title").click(function() {
        $(this).replaceWith("<input class='visible_text_edit' type='text'/>");
        var input_edit = $(".visible_text_edit");
        input_edit.on("keypress", function() {
           if (event.keyCode == 13) {
               event.preventDefault();
               var title_template = "<span class='task_item_title'>%title%</span><br/>";
               var text_input = $(this);
               var value = template(title_template, ["%title%"], [text_input.val()]);
               text_input.replaceWith(value);
           }
        });
        var parent = input_edit.parent(".task_item");
        var current_task = tasks.tasks.find(function(item) {
           return item.id == parent.data("id");
        });
        input_edit.val(current_task.title);
        input_edit.focus();
    });

});