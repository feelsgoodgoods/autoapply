const fs = require('fs');
const path = require('path');
const { createDocRecordFromJobRecord } = require('../utils/record_doc'); 

const filePath = path.join(__dirname, 'job_record.json');

// Function to read JSON file and get job details based on job ID
const getJobDetails = async () => {
// Read the file content
const data = fs.readFileSync(filePath, 'utf8');
const json = JSON.parse(data);

// console.log('json', json)
let docRecord = createDocRecordFromJobRecord(json);

// Return the job details
return json;
};

// Get and print the job details
getJobDetails()
