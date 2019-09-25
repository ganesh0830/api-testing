# JSON Test Data files 
The Test data files contain groups of tests that the Rest API Testing Framework will process. Tests can be defined to be run in parallel or sequential. 


## JSON Test Data file fields 
Below are all the available fields in a JSON Test Data file. 

### Test file configuration
These parameters are mandatory. 

| Parameter           | Usage                               |
| ------------------- |-------------------------------------|
| environmentData     | Mandatory, path to the environmental json file exported from Postman. |
| collectionFile      | Mandatory, path to the collection json file exported from Postman. |


```json
{
	"environmentData": "./tests/UnifiedOS/config/AnsibleTower-HomeLab.postman_environment.json",
	"collectionFile": "./tests/UnifiedOS/config/AnsibleTowerAPI.postman_collection.json",
```  

### Groups - an array of groups that contains tests. 

| Parameter           | Usage                               |
| ------------------- |-------------------------------------|
| groupName     | The Test Group name |
| groupDescription      | The description for the Test Group |
| groupType      | The way the tests should be processed. sequential or parallel |  

```json 
	"groups": [{
		"groupName": "testgroup1",
        "groupDescription":"",
		"groupType": "sequential",

```
### Tests - an array of test objects

| Parameter           | Usage                               |
| ------------------- |-------------------------------------|
| testName     | The Test  name |
| testDescription      | The description for the Test. Used as the Jira Test Issue Summary value |
| testExpectedResult      | *Optional:* The tests expected result is an passed into the postman test |  
| testCollectionFolder      | *Optional:* The Postman collection folder to use for the tests|
| testParameters      | *Optional:* Test Parameters is allows for additional information to be passed to the Postman collection. For example this could be values needed in a URL. |
| testURL      | *Optional:* The URL for the test |
| testBody      | *Optional:* The Body of the main request for the test. For example this could be submitting a shopping cart. |

```json 
"tests": [{
				"testName": "TestApache",
                "testDescription":"Unified OS Testcase 01.01: Test that Apache server is running on port 80",
                "testExpectedResult":"successful",
                "testCollectionFolder": "TestPlaybook",
                "testParameters":{"JobTemplateName":"Apache port check"},
				"testURL": "",
				"testBody": {"extra_vars":{"checkport": "80"}}
			},
            {
                ...another test...
            }

		]
```
---
## Using Stored values from tests
The Rest API Testing Framework can store values from tests for reuse in future tests.  For details on how to store values from tests please refer to the [Creating a Postman Collection File document](postman-collection-file.md).

When the Rest API Testing Framework processes test files it looks for stored value template fields. These template fields look like this ```{{svServername}}``` The stored values can be used in the following fields ```testParameters```, ```testURL``` and ```testBody```. 

Below is an example of using stored values from the FakeAPI test data file. Stored values are used in the ```testParameters```, ```testURL``` and ```testBody```:  
```
{
                "testName": "FAKE API Testcase 01:03 - Update Details",
                "testDescription":"FAKE API Testcase 01:03 - Update Details",
                "testExpectedResult":"successful",
                "testCollectionFolder": "updatePost",
                "testParameters":{"JobTemplateName":"Apache port check {{svServername}}"},
                "testURL": "https://jsonplaceholder.typicode.com/posts/{{svId}}",
                "testBody": {
                    "id": "{{svId}}",
                    "title": "ad iusto omnis odit dolor voluptatibus",
                    "body": "minus omnis soluta quia\nqui sed adipisci voluptates illum ipsam voluptatem\neligendi officia ut in\neos soluta similique molestias praesentium blanditiisss {{svServername}}",
                    "userId": 9
                }
            }
```

---
## Example Test files

Example 1: 

```json
{
	"environmentData": "./tests/UnifiedOS/config/AnsibleTower-HomeLab.postman_environment.json",
	"collectionFile": "./tests/UnifiedOS/config/AnsibleTowerAPI.postman_collection.json",
	"groups": [{
		"groupName": "testgroup1",
        "groupDescription":"",
		"groupType": "sequential",
		"tests": [{
				"testName": "TestApache",
                "testDescription":"Unified OS Testcase 01.01: Test that Apache server is running on port 80",
                "testExpectedResult":"successful",
                "testCollectionFolder": "TestPlaybook",
                "testParameters":{"JobTemplateName":"Apache port check"},
				"testURL": "",
				"testBody": {"extra_vars":{"checkport": "80"}}
			}
		]
	}
    ]
}
```

Example 2: 
```json
{
    "environmentData": "./tests/azure/config/newman-tests.postman_environment.json",
    "collectionFile": "./tests/azure/config/NewmanRunbook.postman_collection.json",
    "groups": [
        {
            "groupName": "Group_0",
            "groupDescription": "",
            "groupType": "sequential",
            "tests": [
                {
                    "testName": "New-ResourceGroup",
                    "testDescription": "Testcase 1.02: Create a new ResourceGroup in Azure",
                    "testExpectedResult": "SUCCESS ResourceGroup: gla-dev2-p-rsg-a601990postmanrgtests created successfully.",
                    "TestRecordFolder": null,
                    "testURL": null,
                    "testBody": {
                        "properties": {
                            "runbook": {
                                "name": "New-ResourceGroup",
                                "Description": "Testcase 1.02: Create a new ResourceGroup in Azure"
                            },
                            "parameters": {
                                "SubscriptionId": "3baa11a4-2b57-4403-b172-3a2117bababa",
                                "ResourceGroupName": "a601990postmanrgtests",
                                "ResourceGroupLocation": "West Europe",
                                "EnvironmentType": "Production",
                                "RequestorUserAccount": "Testcase 1.02",
                                "ConfigurationItemId": "Testcase 1.02"
                            }
                        }
                    }
                },
                {
                    "testName": "New-ResourceGroup",
                    "testDescription": "Testcase 5.04: Create a new ResourceGroup with an already existing name",
                    "testExpectedResult": "FAILURE ResourceGroupName: gla-dev2-p-rsg-a601990postmanrgtests already exists.",
                    "TestRecordFolder": null,
                    "testURL": null,
                    "testBody": {
                        "properties": {
                            "runbook": {
                                "name": "New-ResourceGroup",
                                "Description": "Testcase 5.04: Create a new ResourceGroup with an already existing name"
                            },
                            "parameters": {
                                "SubscriptionId": "3baa11a4-2b57-4403-b172-3a2117bababa",
                                "ResourceGroupName": "a601990postmanrgtests",
                                "ResourceGroupLocation": "West Europe",
                                "EnvironmentType": "Production",
                                "RequestorUserAccount": "Testcase 5.04",
                                "ConfigurationItemId": "Testcase 5.04"
                            }
                        }
                    }
                },
                {
                    "testName": "Remove-ResourceGroup",
                    "testDescription": "Testcase 6.02: Remove the gla-dev2-p-rsg-a601990postmanrgtests ResourceGroup in Azure",
                    "testExpectedResult": "SUCCESS ResourceGroup: gla-dev2-p-rsg-a601990postmanrgtests removed successfully.",
                    "TestRecordFolder": null,
                    "testURL": null,
                    "testBody": {
                        "properties": {
                            "runbook": {
                                "name": "Remove-ResourceGroup",
                                "Description": "Testcase 6.02: Remove the gla-dev2-p-rsg-a601880postmanrgtests ResourceGroup in Azure"
                            },
                            "parameters": {
                                "SubscriptionId": "3baa11a4-2b57-4403-b172-3a2117bababa",
                                "ResourceGroupName": "gla-dev2-p-rsg-a601990postmanrgtests",
                                "RequestorUserAccount": "Testcase 6.02",
                                "ConfigurationItemId": "Testcase 6.02"
                            }
                        }
                    }
                }
            ]
        }
    ]
}
```