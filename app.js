var newman = require('newman'); // require newman in your project
var junitReportMerger = require('junit-report-merger');
const each = require('promise-each')
var dateFormat = require('dateformat');
var recursive = require("recursive-readdir");
var winston = require('winston');
require('winston-daily-rotate-file');
var path = require('path'), fs = require('fs');
var minimist = require('minimist');
const XunitViewerCli = require('xunit-viewer/cli')

var storedValues = []

if (fs.existsSync('./config.json')) {
    var config = require('./config.json');
}

var transportLog = new winston.transports.DailyRotateFile({
    filename: './logs/log',
    datePattern: 'yyyy-MM-dd.',
    prepend: true,
    level: 'info'
  });
  
  var logger = new (winston.Logger)({
    transports: [
      transportLog, new (winston.transports.Console)
    ]
  });

var args = minimist(process.argv.slice(2));
var testDataPath = args["testspath"];
var testData;
var testRunsPath = '';

if (!fs.existsSync('./logs/')) {
    fs.mkdirSync('./logs/');
}

process.on('uncaughtException', function(err) {
    logger.log('error', 'Fatal uncaught exception crashed cluster', err, function(err, level, msg, meta) {
        process.exit(1);
    });
});

if (testDataPath == null){
    var errMsg = 'You must provide a value for the parameter testspath';

    logger.log('error', errMsg, function(err, level, msg, meta) {
        
    });

    process.exit(1);
}

if (config !== undefined)
{
    if (config.HTTP_PROXY !== undefined)
    {
        process.env.HTTP_PROXY = config.HTTP_PROXY
    }
    if (config.HTTPS_PROXY !== undefined)
    {
        process.env.HTTPS_PROXY = config.HTTPS_PROXY
    }
}


let updateNUnitFile = function(file, testName) {
    return new Promise(function(resolve, reject) {

        logger.log('info', "[JUNITUPDATE] - processing file " + file)

        fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
                reject(err);
            }

            //remove all testsuite with 0 tests from the report
            var re1 = /.*tests="0".*[\r\n]/g
            var re2 = /<testsuite name="([A-z|0-9].*\s\/\s)(GenericReadJob.*?)"|<testsuite name="(GenericReadJob.*?)"/g
            var re3 = /<testsuite name="([A-z|0-9].*\s\/\s)(Test.*?)"|<testsuite name="(Test.*?)"/g
            var result = data.replace(re1, '').replace(re2, '<testsuite name=\"' + testName + "\"").replace(re3, '<testsuite name=\"' + testName + "\"");

            fs.writeFile(file, result, 'utf8', function (err) {
                if (err) reject(err);;
                resolve();
            });
            
        })
        
    });
};

function buildTestObj(testParameters) {

    // must go into an array as Newman expects it in this format
    var testList = [];	
    
    // check for any template fields in the testBody and replace
    // with any matching items in the SavedValues array  

    //build record
    var testRecord = {};
    testRecord.name = testParameters.testName;
    testRecord.description = testParameters.testDescription;
    testRecord.expectedResult = testParameters.testExpectedResult;
    
    let testURL = testParameters.testURL;
    let additionalTestParameters = JSON.stringify(testParameters.testParameters)
    let testpayload = JSON.stringify(testParameters.testBody);

    for (var vsi = 0, len = storedValues.length; vsi < len; vsi++) {
        var svKeyRegEx = new RegExp('{{'+storedValues[vsi].svKey+'}}',"g");

        if (testParameters.testParameters !== undefined){
            additionalTestParameters = additionalTestParameters.replace(svKeyRegEx, storedValues[vsi].svValue)
        }
        testpayload = testpayload.replace(svKeyRegEx, storedValues[vsi].svValue)
        testURL = testURL.replace(svKeyRegEx, storedValues[vsi].svValue)
    }

    if (testParameters.testParameters !== undefined){
        testRecord.testParameters = JSON.parse(additionalTestParameters);
    }

    testRecord.url = testURL

    testRecord.payload = testpayload //JSON.stringify(testParameters.testBody);
    testList.push(testRecord);

	return testList;
}

let processTest = function(testObj, groupID, testCount, environmentDataFile, collectionDataFile) {
  return new Promise(function(resolve, reject) {

    var test = buildTestObj(testObj);
    var testName = testObj.testName;

    logger.log('info', 'Starting processing test ' + testName);

    //logger.log('info', 'Test ID: T' + testCount);

    var junitFilePath = testRunsPath+'/'+groupID+'T'+testCount+'.xml';
    logger.log('info', 'Test file path '+ junitFilePath)

    try {
        if (!fs.existsSync(collectionDataFile)) {
            reject('Postman collection data file does not exist: ' + collectionDataFile);
            return;
        }

        if (!fs.existsSync(environmentDataFile)) {
            reject('Postman environment data file does not exist: ' + environmentDataFile);
            return;
        }
    }
    catch (err) {
        reject(err);
    }

    // console.log(test)
    var collectionTimeout = 3000000 // default 50 mins
    if (config !== undefined && config.collectionTimeout) {
        if (Number.isInteger(config.collectionTimeout)){
            collectionTimeout = (config.collectionTimeout * 60000)
        }
    }

    try {

            newman.run({
                collection: require(collectionDataFile),
                folder: testObj.testCollectionFolder,
                environment: require(environmentDataFile),
                iterationData: test,
                iterationCount: 1,
                timeout: collectionTimeout, 
                insecure: true,
                reporters: ['junitextended','cli'],
                reporter: { junitextended: { export: junitFilePath } }
            }).on('start', function (err, args) { // on start of run, log to console 
                logger.log('info', '[START] - ' + testName);
            }).on('done', function (err, summary) {
                if (err || summary.error) {
                    logger.log('error', '[ERROR] - With the test: ' + testName);
                    logger.log('error', '[ERROR] ' + summary.error);
                    reject(err + ' - ' + summary.error);
                    return;
                }
                else {
                    // check for global values from the newman request and store them for use
                    
                    for (var vsi = 0, len = summary.globals.values.members.length; vsi < len; vsi++) {

                        if (summary.globals.values.members[vsi].key.startsWith("sv")){
                            logger.log('info', 'Stored value: ' + JSON.stringify(summary.globals.values.members[vsi]));  

                            let svMatch = false
                            let svK = summary.globals.values.members[vsi].key
                            let svV = summary.globals.values.members[vsi].value
                            for (svi = 0; svi < storedValues.length; svi++) { 

                                if (storedValues[svi].svKey == svK){
                                    svMatch = true
                                    storedValues[svi].svValue = svV
                                    
                                }    

                            }
                            if (svMatch == false){
                                var storedValue = {svKey:svK, svValue : svV}
                                storedValues.push(storedValue)
                            }
                        }
                        
                    }

                    //vsi

                    

                    // Pull back all results that start with StoredValue*****  save into array 

                    updateNUnitFile(junitFilePath, testName).then(function(result){
                        logger.log('info', '[END] ' + testName);
                        resolve('Finished processing test ' + testName); 
                    }).catch(function (result) {
                        logger.log('info', result);
                    });			
                }
            });
        }
    catch (err) {
        reject(err);
    }

    // only use when testing without Newman
    // logger.log('info', 'Finished processing test ' + testObj.testName);
    // resolve();
    
  });
};

// process sequential tests list one test at a time. 
let processSequentialTests = function(tests, groupID, environmentDataFile, collectionDataFile) {
    return new Promise(function(resolve, reject) {
        
        var testCount = 1; 

        // process each test group
        Promise.resolve(tests)
        .then(each((test) => 
        //handle failed processing
        processTest(test, groupID, testCount, environmentDataFile, collectionDataFile).then(function(result){
                    logger.log('info', result);
                    logger.log('info', 'Test processing completed for ' + test.testName);
                    testCount += 1;
                })    
        )).then(function(result){
            logger.log('info', 'Processed all tests');
            resolve('Processed all tests');
        }).catch(function (err) {
            var err_msg = 'Error processing sequential tests. ' + groupID;
            // logger.log('error', err_msg + ' \r\n ' + err);
            reject(err_msg + ' \r\n ' + err);
        });
        
    });
};

// process parallel tests list and create a array of promises
// await all promises to complete
let processParallelTests = function(tests, groupID, environmentDataFile, collectionDataFile) {
    return new Promise(function(resolve, reject) {

        var promiseParallelTests = [];

        for (var i = 0, len = tests.length; i < len; i++) {
            promiseParallelTests.push(processTest(tests[i],groupID,(i+1), environmentDataFile, collectionDataFile));
        }

        Promise.all(promiseParallelTests).then(function(){
            logger.log('info', 'All done with Parallel Tests')
            resolve();
        }).catch(function (err) {
            var err_msg = 'Error processing parallel tests. ' + groupID;
            logger.log('error', err_msg + ' \r\n ' + err);
            reject(err);
        });
        
    });
};

// process a single test group
let processGroup = function(group, groupCount, testFileName, environmentDataFile, collectionDataFile) {
  return new Promise(function(resolve, reject) {
    
    logger.log('info', 'Starting processing group of tests')

    //logger.log('info', 'G'+groupCount);
    
    switch (group.groupType) {
        case 'parallel':
            logger.log('info', "PARALLEL Group");
            logger.log('info', "Group Name: " + testFileName+'_'+group.groupName)

            processParallelTests(group.tests,testFileName+'_G'+groupCount, environmentDataFile, collectionDataFile)
            .then(function(result){
                logger.log('info', 'Completed Parallel Tests for ' + group.groupName);
                resolve('Processed group');
            })
            .catch(function (err) {
                reject(err);
            })
            break;
        case 'sequential':
            logger.log('info', "SEQUENTIAL Group");
            logger.log('info', "Group Name: " + testFileName+'_'+group.groupName);
            
            processSequentialTests(group.tests,testFileName+'_G'+groupCount, environmentDataFile, collectionDataFile)
            .then(function(result){
                logger.log('info', 'Completed Sequential Tests for ' + group.groupName);
                resolve('Processed group');
            }).catch(function (err) {
                reject(err);
            })
            break;
        default:
            var err = 'Could not match test group type';
            //logger.log('error', err);
            reject(err);
    }
    
  });
};

let processJunitFiles = function() {
  return new Promise(function(resolve, reject) {
        
        recursive(testRunsPath,['junitReportMerged.xml']).then(
        function(junitFileList) {
            junitReportMerger.mergeFiles(testRunsPath+'/junitReportMerged.xml', junitFileList, [], function (res, err) {
            if (err) {
                logger.log('error',err)
                reject(err);
            } else {
                logger.log('info', 'Successfully merged all junit reports into '+testRunsPath+'/junitReportMerged.xml' );
                resolve();
            }
        });
        },
        function(err) {
            reject(err);
        }
        );
    });
};


// process the test groups
let processGroups = function(testFilePath) {
  return new Promise(function(resolve, reject) {

    try {
        if (!fs.existsSync(testFilePath)) {
            reject('Test file does not exist: ' + testFilePath);
            return;
        }
            testData = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
            var environmentDataFile = testData.environmentData;
            var collectionDataFile = testData.collectionFile;
            testFileName = path.basename(testFilePath, '.json')
            
            logger.log('info', 'Started processing test file: ' + testFilePath);
            logger.log('info', 'Started processing all groups');
            var groupCount = 1;
        }
    catch (err) {
        reject(err);
    }

         
        // process each test group
        Promise.resolve(testData.groups)
        .then(each((group) => 
        processGroup(group, groupCount, testFileName, environmentDataFile, collectionDataFile).then(function(result){
                    logger.log('info', 'Group processing completed for ' +testFileName+'_'+ group.groupName);
                    groupCount += 1;
                })     
        ))
        .then(function(result)
        {
            resolve('Compeleted processing all groups');
        })
        .catch(function (err) {
            reject(err);
            //logger.log('error', err);
        });

    });
};

function fromDir(startPath,filter,callback){

    //console.log('Starting from dir '+startPath+'/');

    if (!fs.existsSync(startPath)){
        logger.log('error', 'Directory not found: ' + startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            // fromDir(filename,filter,callback); //recurse
        }
        else if (filter.test(filename)) callback(filename);
    };
};

// starting application 
logger.log('info', 'Starting MSF Rest API Testing');

var testFileList =[];
if (testDataPath.includes('.json')){
    testFileList.push(testDataPath)
}
else
{   
    fromDir(testDataPath,/\.json$/,function(filename){    
        testFileList.push(filename)
    });
}

// Build test runs path and create the folder
var now = new Date();
var today = dateFormat(now, 'yyyy-dd-mm');
var time = dateFormat(now,'HH-MM');
testRunsPath = './test_runs/'+today+'/'+time;

if (!fs.existsSync('./test_runs')) {
    fs.mkdirSync('./test_runs');
}
if (!fs.existsSync('./test_runs/'+today)) {
    fs.mkdirSync('./test_runs/'+today);
}
if (!fs.existsSync(testRunsPath)) {
    fs.mkdirSync(testRunsPath);
}
if (!fs.existsSync('./test_runs/latest')) {
    fs.mkdirSync('./test_runs/latest');
}

Promise.resolve(testFileList)
    .then(each((testFile) => 
        processGroups(testFile).then(function(result){
            logger.log('info', result );
        })
    ))
    .then(function(result){ 
        return processJunitFiles();
    })
    .then(function(result){
        fs.createReadStream(testRunsPath+'/junitReportMerged.xml').pipe(fs.createWriteStream('test_runs/latest/junitReportMerged.xml'));
        
        if (config !== undefined && config.HTMLResultsReport_Create) {
            logger.log('info', 'Creating Results Report in html format');
            XunitViewerCli({
                results: 'test_runs/latest/junitReportMerged.xml',
                ignore: [],
                output: 'test_runs/latest/HTMLReport.html',
                title: config.HTMLResultsReport_Title,
                port: false,
                watch: false,
                color: true,
                filter: {}
            })   
        }
    
        logger.log('info', 'Stopping MSF Rest API Testing');
    })
    .catch(function (result) {
        logger.log('error', result);
});