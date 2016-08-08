/**
 * Created by jeff on 4/08/16.
 */

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
 * Applies a template to return a text with the variables substituted.
 * @param variables Array of variable names. Ex: ["%var1%","%var2%"].
 * @param values Array of variable values (in the same order of variables). Ex: ["algorithm", "nothing"].
 */
String.prototype.format = function (variables, values) {
    var textTemplate = this;
    variables.forEach(function(item, index) {
        if (typeof values[index] === 'undefined' || values[index] == null) {
            return;
        }
        textTemplate = textTemplate.replaceAll(item, values[index]);
    });
    return textTemplate;
};

/**
 * Determines if the string is empty or whitespace.
 * @returns {boolean} True if the string is empty or whitespace, false if not.
 */
String.prototype.isWhitespace = function () {
    return this.trim() == "";
};

/**
 * Quotes a string with a starting and ending symbol.
 * @param sym Symbol. If not defined, quotes " are used.
 * @returns {string} Quoted string.
 */
String.prototype.quote = function(sym) {
    if (!sym) {
        sym = '"';
    }
    return sym + this + sym;
};