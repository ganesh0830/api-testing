var _ = require('lodash'),
xml = require('xmlbuilder'),

util = require('./util'),
JunitReporter;

/**
* A function that creates raw XML to be written to Newman JUnit reports.
*
* @param {Object} newman - The collection run object, with a event handler setter, used to enable event wise reporting.
* @param {Object} reporterOptions - A set of JUnit reporter run options.
* @param {String=} reporterOptions.export - Optional custom path to create the XML report at.
* @returns {*}
*/
JunitReporter = function (newman, reporterOptions) {
newman.on('beforeDone', function () {
    var report = _.get(newman, 'summary.run.executions'),
        collection = _.get(newman, 'summary.collection'),
        cache,
        root,
        testSuitesExecutionTime = 0,
        executionTime = 0;

    if (!report) {
        return;
    }

    root = xml.create('testsuites', { version: '1.0', encoding: 'UTF-8' });
    root.att('name', collection.name);

    cache = _.transform(report, function (accumulator, execution) {
        accumulator[execution.id] = accumulator[execution.id] || [];
        accumulator[execution.id].push(execution);
    }, {});

    _.forEach(cache, function (executions, itemId) {
        var suite = root.ele('testsuite'),
            currentItem,
            tests = {},
            errorMessages;

        collection.forEachItem(function (item) {
            (item.id === itemId) && (currentItem = item);
        });

        if (!currentItem) { return; }

        suite.att('name', util.getFullName(currentItem));
        suite.att('id', currentItem.id);

        _.forEach(executions, function (execution) {
            var iteration = execution.cursor.iteration,
                errored,
                msg = `Iteration: ${iteration}\n`;

            // Process errors
            if (execution.requestError) {
                errored = true;
                msg += ('RequestError: ' + (execution.requestError.stack) + '\n');
            }
            msg += '\n---\n';
            _.forEach(['testScript', 'prerequestScript'], function (prop) {
                _.forEach(execution[prop], function (err) {
                    if (err.error) {
                        errored = true;
                        msg = (msg + prop + 'Error: ' + err.error.stack);
                        msg += '\n---\n';
                    }
                });
            });

            if (errored) {
                errorMessages = _.isString(errorMessages) ? (errorMessages + msg) : msg;
            }

            // Process assertions
            _.forEach(execution.assertions, function (assertion) {
                var name = assertion.assertion,
                    err = assertion.error;
                if (err) {
                    (_.isArray(tests[name]) ? tests[name].push(err) : (tests[name] = [err]));
                }
                else {
                    tests[name] = [];
                }
            });
            if (execution.assertions) {
                suite.att('tests', execution.assertions.length);
            }
            else {
                suite.att('tests', 0);
            }
        });

        suite.att('time', _.mean(_.map(executions, function (execution) {
            executionTime = _.get(execution, 'response.responseTime') / 1000 || 0;
            testSuitesExecutionTime += executionTime;
            return executionTime;
        })));
        errorMessages && suite.ele('error').dat(errorMessages);

        _.forOwn(tests, function (failures, name) {
            var testcase = suite.ele('testcase'),
                failure;
            testcase.att('name', name);
            testcase.att('time', executionTime);
            if (failures && failures.length) {
                failure = testcase.ele('failure');
                failure.att('type', 'AssertionFailure');

                if (failures.length == 1){
                    failure.dat('Failed: ' + failures[0].message );
                }
                else if (failures.length > 1){

                    let failuresMsgArr = []
                    for (fi = 0; fi < failures.length; fi++) { 

                        if (fi == 0){
                            failuresMsgArr[0] = failures[fi].message
                        }else {
                            if (failuresMsgArr[0] != failures[fi].message){
                                failuresMsgArr[fi] = failures[fi].message
                            }
                        }
                    }

                    let failMsg = ""
                    for (fi = 0; fi < failuresMsgArr.length; fi++) { 
                        if (fi > 0){
                            failMsg = failMsg + ", "
                        }
                        failMsg = failMsg + failuresMsgArr[fi]
                    }
                    failure.dat('Failed: ' + failMsg );
                }
                
                //failure.att('message', failures[0].message);
                
                // old failure message
                //failure.dat('Failed ' + failures.length + ' times.');
            }
        });
    });

    root.att('time', testSuitesExecutionTime);
    newman.exports.push({
        name: 'junit-reporter',
        default: 'newman-run-report.xml',
        path: reporterOptions.export,
        content: root.end({
            pretty: true,
            indent: '  ',
            newline: '\n',
            allowEmpty: false
        })
    });
});
};

module.exports = JunitReporter;