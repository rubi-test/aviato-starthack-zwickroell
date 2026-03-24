Context:

I have a MongoDB 4.4 database running at 'localhost:27017' - it is a docker container that contains around 100GB in tests and stuff in the 'txp_clean' folder. So it's really big - keep that in mind when doing the querries.


here is the structure of a Test Document from the DB, so you know what you will be working with:
{
  "_id": "{D1CB87C7-D89F-4583-9DA8-5372DC59F25A}",
  "clientAppType": "testXpert III",
  "state": "finishedOK",
  "tags": [
    "{B9D90822-09A8-4eab-871B-70FD0C1B4CD3}"
  ],
  "version": "2.1772195387.0",
  "valueColumns": [
    {
      "unitTableId": "Zwick.Unittable.Displacement",
      "valueTableId": "{E4C21909-B178-4fdc-8662-A13B4C7FF756}-Zwick.Unittable.Displacement",
      "_id": "{E4C21909-B178-4fdc-8662-A13B4C7FF756}-Zwick.Unittable.Displacement_Key",
      "name": "Strain / Deformation",
    },
   ...
  ],
  "hasMachineConfigurationInfo": false,
  "testProgramId": "TestProgram_2",
  "testProgramVersion": "2.1772195387.0",
  "name": "01",
  "modifiedOn": {},
  "TestParametersFlat": { [see nextmsg]
  }
}
 contd.
  "TestParametersFlat": {  "TYPE_OF_TESTING_STR": "tensile",
    "MACHINE_TYPE_STR": "Static",
    "STANDARD": "DIN EN ",
    "TESTER": "Tester_1",
    "NOTES": "Auswertung E-Modul nach ClipOn Punkten",
    "Wall thickness": 0.002,
    "SPECIMEN_THICKNESS": 0.001925,
    "SPECIMEN_WIDTH": 0.015075,
    "Diameter": 0.00011,
    "Outer diameter": 0.1,
    "Inner diameter": 0.008,
    "Fineness": 0.00001,
    "Density of the specimen material": 1000,
    "Weight of the specimen": 0.001,
    "Total length of the specimen": 0.1,
    "Cross-section input": 0.000001,
    "Parallel specimen length": 0.1,
    "Marked initial gage length": 0.08,
    "TEST_SPEED": 0.0000333333333333,
    "Date": "26.11.2021",
    "Upper force limit": 3000,
    "Maximum extension": 0.005,
    "Cross-section correction factor": 1,
    "Negative cross-section correction value": 0,
    "Grip to grip separation at the start position": 0.1227327709145275,
    "Type of Young's modulus determination": 1,
    "Begin of Young's modulus determination": 0.0005,
    "End of Young's modulus determination": 0.0025,
    "Force shutdown threshold": 20,
    "Gage length, fine strain": 0.02,
    "Speed, Young's modulus": 0.0000166666666667,
    "Speed, point of load removal": 0.0008333333333333,
    "Speed, yield point": 0.0000166666666667,
    "Max. permissible force at end of test": 250,
    "Tube definition": 2,
    "Travel preset x1%": 0.01,
    "Travel preset x2%": 0.02,
    "Young's modulus preset": 210000000000,
    "JOB_NO": "11918",
    "CUSTOMER": "Company_1",
    "SPECIMEN_TYPE": "IPS",
    "Headline for the report": "Prüfprotokoll",
    "Clock time": "09:42:38",
    "Gage length after break": 0.12,
    "Diameter 1 after break": 0.002,
    "Diameter 2 after break": 0.009,
    "Specimen thickness after break": 0.002,
    "Specimen width after break": 0.005,
    "Cross-section after break": 0
}


HERE IS THE DOCUMENTATION GIVEN BY THE DATA PROVIDERS:

"In many areas of the Data you will stumble upon UUIDs. We tried to migrate them as best we could, but on some places they are still integral.
Valuecolumns

this is the propably biggest source for UUIDs. The structure of a valucolumn entry, consist of two important metadatas: refId and childId

    refId is a reference to the source test _id
    childId is id constructed by the `[test.valuecolumns._id].[test.valuecolumn.valuetableId]
    The UUIDs in childId is a reference to the type of value stored there. In the repository you will find files containing translations for these UUIDs, as well as the possible unittables.
        for Results (valuecolumn has only a single value), take a look at the file TestResultTypes
        for Measurements, take a look at the channelParameterMap
    some test.valuecolumn._id end with a _key - they can be safely ignored and weren't migrated into this test dataset
"



For the Value Collection, where Measurements are Results are stored, the structure looks like this:
{
  "_id": {
    "$oid": "69b04a53df0316ab9612e11a"
  },
  "fileId": "69a18e51467aa52ae03afe9d",
  "filename": "%7B80A0F677-89BE-46e2-9F16-59409E96D8B6%7D-2.1772195394.0-%7B778AB883-C25D-448b-B1A2-3808046340ED%7D-Zwick.Unittable.ForcePerTiter.%7B778AB883-C25D-448b-B1A2-3808046340ED%7D-Zwick.Unittable.ForcePerTiter_Value",
  "uploadDate": {
    "$date": "2026-02-27T12:30:09.627Z"
  },
  "bufferLength": 8,
  "values": [
    196970697911.446
  ],
  "valuesCount": 1,
  "metadata": {
    "refId": "{80A0F677-89BE-46e2-9F16-59409E96D8B6}",
    "rootVersion": "2.1772195394.0",
    "childId": "{778AB883-C25D-448b-B1A2-3808046340ED}-Zwick.Unittable.ForcePerTiter.{778AB883-C25D-448b-B1A2-3808046340ED}-Zwick.Unittable.ForcePerTiter_Value"
  }
}




here is a Aggregation you can use to see all materials present in the tests collection. You can simply paste it under Aggregation (select Text on the right side, if you are using MongoDB Compass):
[
  {
    $group: {
      _id: "$TestParametersFlat.MATERIAL"
    }
  },
  {
    $match: {
      _id: {
        $ne: null
      }
    }
  },
  {
    $project: {
      _id: 0,
      uniqueValues: "$_id"
    }
  }
]


IN the folder UUID_helpers in backend,

Ive provided TestParameterMap.json  that correlates ID with type. I want you to focus on STANDARD - which is the test type

There is a channelParameterMap.ts that maps an id to another value 

and there is a testResultTypes.ts
