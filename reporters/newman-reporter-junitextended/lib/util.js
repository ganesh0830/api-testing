var fs = require('fs'),
url = require('url'),
_ = require('lodash'),

util,
version = '3.8.3',

SEP = ' / ',

/**
 * The auxiliary character used to prettify file sizes from raw byte counts.
 *
 * @type {Object}
 */
FILESIZE_OPTIONS = { spacer: '' },

PRO_API_HOST = 'api.getpostman.com',
USER_AGENT_VALUE = 'Newman/' + version;

util = {

/**
 * Resolves the fully qualified name for the provided item
 *
 * @param {PostmanItem|PostmanItemGroup} item The item for which to resolve the full name
 * @param {?String} [separator=SEP] The separator symbol to join path name entries with
 * @returns {String} The full name of the provided item, including prepended parent item names
 * @private
 */
getFullName: function (item, separator) {
    if (_.isEmpty(item) || !_.isFunction(item.parent) || !_.isFunction(item.forEachParent)) { return; }

    var chain = [];
    item.forEachParent(function (parent) { chain.unshift(parent.name || parent.id); });

    item.parent() && chain.push(item.name || item.id); // Add the current item only if it is not the collection
    return chain.join(_.isString(separator) ? separator : SEP);
},

};

module.exports = util;