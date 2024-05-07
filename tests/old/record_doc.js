const { callChatGPT } = require("../utils/callChatGPT");
const { db, queryDb } = require("../utils/db");
const { executeWorkerFunction } = require("../utils/misc");
const fs = require("fs");

const attrs = [
  "companyName",
  "position",
  "companyPost",
  "applicationUrl",
  "supplementalUrls",
  "benefits",
  "compensation",
  "departmentOrTeam",
  "description",
  "education",
  "email",
  "expectations",
  "experience",
  "instructionsToApplicant",
  "qualifications",
  "remoteAvailable",
  "responsibilities",
  "role",
  "skills",
  "tasks",
  "techStack",
  "terms",
  "companyWebsiteHostname",
  "achievements",
  "clients",
  "coreActivities",
  "culture",
  "currentEvents",
  "founded",
  "industry",
  "investors",
  "mission",
  "partners",
  "products",
  "size",
  "whyWorkForUs",
  "webText",
  "appText",
];
attrs = attrs ? attrs + "," : "";

function createDocRecordsTable() {
  queryDb(`CREATE TABLE IF NOT EXISTS doc_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName TEXT,
    position TEXT,
    companyPost TEXT,
    applicationUrl TEXT,
    supplementalUrls TEXT,
    benefits TEXT,
  )`);
}
// createDocRecordsTable();

// ATFs like workaday greenhouse icims paylocity
// show youtube links in a carousel.
let insertDocRecord = async (insertJobPostsRecord) => {
  const attrs = [
    "companyName",
    "position",
    "companyPost",
    "applicationUrl",
    "supplementalUrls",
  ];
  const query = `
    INSERT INTO doc_records (${attrs.join(", ")})
    VALUES (${new Array(attrs.length).fill("?").join(", ")})
  `;
  const values = attrs.map((attr) => JSON.stringify(data[attr]));
  db.query(query, values, (err, results) => {
    if (err) return false;
    // res.send('insertJobPostsRecord success!');
    return results;
  });
};

async function createAndInsertJobRecordsFromcompanyRecord(jobPost) {
  const parsedResponse = createDocRecordFromJobRecord(jobPost);
  insertDocRecord(parsedResponse);
  return parsedResponse;
}

//
// EXTRACT UTILS
//
function customMerge(obj1, obj2) {
  const result = {};
  for (const key in obj1) {
    if (obj1.hasOwnProperty(key)) {
      result[key] = obj1[key];
    }
  }
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      // if(typeof obj2[key] === 'boolean') { obj2[key] = `${String(obj2[key])}` }
      if (result.hasOwnProperty(key)) {
        // Make result an array if not already.
        if (!Array.isArray(result[key])) {
          result[key] = [result[key]];
        }
        // And push the new value to it
        if (Array.isArray(obj2[key])) {
          result[key] = [...result[key], ...obj2[key]];
        } else {
          result[key] = [...result[key], obj2[key]];
        }
      } else {
        // If the key only exists in obj2, copy it to the result
        result[key] = obj2[key];
      }
    }
  }
  return result;
}
const extractPrompt = (insert, attributes, companyText) => {
  return `
${insert}
Return an object with the following attributes: [${attributes}]
Attribute values MUST be an array of companyTEXT EXTRACTS.

Here is the companyTEXT:
${companyText}
`;
};
// I can't pass both the latex resume and the job record to chatgpt because it's too much text. Here is my plan to break it down.
// ChatGPT Call 1: Input - Jobpost, Output - Summary of important information for job applicant creating cover letter and resume.
// ChatGPT Call 2: Input - JobpostSummary, myLatexResume Output - Summary of best parts of resume that match summary or would stand out to employers.
// ChatGPT Call 3: Input - ResumeSummary, JobpostSummary Output - Cover letter
// ChatGPT Call 3: Input - ResumeSummary, myLatexResume Output - New and Improved Resume

const summarizeRecord = (record) => {
  // Pass our record to chatGPT to summarize it for someone creating
  // a cover letter for record.postion at record.companyName and return the summary
  let summary = callChatGPT(
    `You will be given a record. Return a summary of the record.` +
      JSON.stringify(record)
  );
  return summary;
};

let createDocRecordFromJobRecord = async (jobRecord) => {
  delete jobRecord.webText;
  delete jobRecord.companyPost;
  delete jobRecord.appText;
  console.log("Create a new record");
  let record = {};

  let latexResume = fs.readFileSync(__dirname + "/../latex.txt", "utf8");

  const jobPostSummary = await callChatGPT(
    `Summarize the following job post for the purpose of creating a tailored cover letter and resume: ${JSON.stringify(
      jobRecord
    )}`
  );
  console.log("\n________________\n\nJob Post Summary:", jobPostSummary);

  const resumeSummary = await callChatGPT(
    `Based on the provided job post summary and my resume in LaTeX format, identify the most relevant and standout parts of my resume: Job Post Summary: ${jobPostSummary}, LaTeX Resume: ${latexResume}`
  );
  console.log("\n________________\n\nResume Highlights:", resumeSummary);

  const coverLetter = await callChatGPT(
    `Create a personalized cover letter that highlights the best parts of my resume and aligns with the job post summary: Resume Highlights: ${resumeSummary}, Job Post Summary: ${jobPostSummary}`
  );
  console.log("\n________________\n\nCover Letter:", coverLetter);

  const improvedResume = await callChatGPT(
    `Improve my resume based on the highlighted parts and suggestions. Here are the resume highlights and my current resume in LaTeX format: Resume Highlights: ${resumeSummary}, LaTeX Resume: ${latexResume}`
  );
  console.log("\n________________\n\nImproved Resume:", improvedResume);

  return { jobPostSummary, resumeSummary, coverLetter, improvedResume };
};

// -> createCompany -> createJobPostsFromcompanyRecord -> createJobRecord
// -> extractFromPost -> extractJobInfo && extractCompanyInfo && customMerge -> extract -> callChatGPT

module.exports = {
  createDocRecordFromJobRecord, // tests
};
