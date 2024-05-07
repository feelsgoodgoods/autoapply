//const { scrapeLinks, scrapeLink } = require('../utils/scrape');
const { scrapeLinks, scrapeLink, callChatGPT } = require('../utils/scrape_llm');
const { getLinks } = require('../utils/sitemaps');

// Example usage
const jobPostsPages = ['http://charleskarpati.com/', 'http://cvminigames.com/'];
const additionalLinks = ['https://github.com/karpatic', 'https://charleskarpati.com/blog/aboutme.html'];

// scrapeLinks([...jobPostsPages, ...additionalLinks]);


(async () => {
  // let links = await getLinks("http://charleskarpati.com/");
  let companyText = (await scrapeLink("https://www.sanctuary.computer"))[0];

  let prompt = await extractJobInfo({ companyName: 'Sanctuary Computer' }, 'Technical Studio Lead', companyText);

  console.log(prompt)
})();


async function extractJobInfo(companyRecord, position, companyText, attrs = false) {
  attrs = attrs ? (attrs + ',') : ''
  let jobInsert = `You will be given companyTEXT of a job posting for the position of "${position}" at the company "${companyRecord.companyName}".`
  let job = `${attrs}benefits,compensation,departmentOrTeam,description,education,email,expectations,experience,instructionsToApplicant,qualifications,remoteAvailable,responsibilities,role,skills,tasks,techStack,terms`
  let jobRecord = await extract(jobInsert, job, companyText)
  return jobRecord
}
async function extract(insert, attributes, companyText) {
  let prompt = await extractPrompt(insert, attributes, companyText);
  let gpt = await callChatGPT(prompt);
  return gpt
}
async function extractPrompt(insert, attributes, companyText) {
  return [
    {
      "role": "system", "content": `
You are a helpful assistant designed to output JSON. ${insert}. 
Return an object with the following attributes: [${attributes}]. 
Attribute values MUST be an array of companyTEXT EXTRACTS.
If an attribute is not found, return an empty array.`
    },
    { "role": "user", "content": companyText },
  ]
};