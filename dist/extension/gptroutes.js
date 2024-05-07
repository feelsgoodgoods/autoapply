import { gptutils } from "./gptutils.js";
let { createCompany, addOrUpdateCompany } = gptutils;
import { db } from "./dbroutes.js";

import { callChatGPT } from "./gptcall.js";

//~~~~ Basics

// GPTFN | DBFN
// post_create | checkExistingPost, deletePostFromDatabase

// calls createCompany, addOrUpdateCompany
async function post_create(body) {
  console.group("gpt:POST_CREATE", body);
  let { postUpload: text } = body;
  let returnThis = { status: "succes", data: false };
  console.log(":db:checkExistingPost");
  let post = false;
  const { existingPost, badPost } = await db.checkExistingPost(text);
  if (!badPost.length) {
    // rm ones w a non null company_id
    existingPost.map(async post => {
      if (!post.company_id) {
        console.log(":db:DELETE:");
        await db.deletePostFromDatabase(post.id);
      }
    });
    console.log(":gpt:createcompany:");
    let company = await createCompany(text); //chatgpt
    if (!company) {
      console.log(":NOCOMPANYERROR:");
      returnThis.message = "Problem processing post";
      console.groupEnd();
      return returnThis;
    }
    // console.log(":gpt:addOrupdatecompany:", company);
    post = await addOrUpdateCompany(company); // Add or Updates Post too
    returnThis.data = post;
  } else {
    returnThis.message = "Exists as a Junk Post";
  }
  // console.log("DB:POST_CREATE:", {body,returnThis});
  console.groupEnd();
  return returnThis;
}

//tables: userinfo,companies,posts

//~~~~ Post

async function extract_create_for_post(body) {
  console.group("gpt:extract_create_for_post"); // console.groupEnd();
  let { extract_id } = body;

  let extract = await getExtractById(extract_id);
  let post_id = extract.post_id;
  let company_id = extract.company_id;

  let { jobTitle, companyName } = await getJobTitleAndCompanyName(post_id, company_id);
  let force = true;
  let forceWait = await extractCreateForPost(extract, companyName, jobTitle, force, post_id, company_id);
  let extracts = await getExtractsByPostId(post_id);
  console.log("Returning extracts", forceWait, extracts, "extracts");
  console.groupEnd();
  return { status: "success", extracts };
}

// Grabs post
// Grabs all specific and generic sitemaps where status = 1 || force
// Updates extract text with sitemap text
async function extracts_create_for_post(body) {
  console.group("gpt:extracts_create_for_post"); // console.groupEnd();
  let { company_id, post_id, force } = body;
  console.log({ body });
  let { jobTitle, companyName } = await db.getJobTitleAndCompanyName(post_id, company_id);
  if (!parseInt(post_id)) {
    console.log("post_id=FALSE");
    return false;
  }
  if (!parseInt(company_id)) {
    console.log("company_id=FALSE");
    return false;
  }

  // grab for all extracts
  let extracts = await db.getExtractsForPost(post_id);

  // grab all sitemaps => filter those in extracts to update_post_specific_link
  let sitemaps = await db.getSitemapsForCompany(company_id);

  // grab specific sitemaps => filter those in extracts, update extracts with sitemap text
  let specific = sitemaps.filter(sitemap => sitemap.specific === 1);
  specific = specific.filter(sitemap => (sitemap.type = "specific") && !extracts.some(extract => extract.sitemap_id === sitemap.id && (extract.text = sitemap.text)));

  // grab generic sitemaps => filter those in extracts, update extracts with sitemap text
  let generic = sitemaps.filter(sitemap => sitemap.generic === 1);
  generic = generic.filter(sitemap => (sitemap.type = "generic") && !extracts.some(extract => extract.sitemap_id === sitemap.id && (extract.text = sitemap.text)));

  let posts = await db.getPostsForCompanyAndPost(company_id, post_id);
  posts = posts.filter(post => (post.type = "post") && !extracts.find(extract => extract.post_id === post.id));

  // filter extracts where status = 1
  extracts = extracts.filter(extract => extract.status === 1);
  /*
    console.log('2. extracts_create_for_pos', {
        force,
        companyName,
        company_id,
        post_id,
        jobTitle,
        extracts: extracts.length,
        generic: generic.length,
        specific: specific.length,
        sitemaps: sitemaps,
        posts: posts.length
    })
    */
  let records = [...extracts, ...specific, ...generic, ...posts];
  console.log("extracts_create_for_pos # Extracts: ", records.length);

  for (let extract of records) {
    db.extractCreateForPost(extract, companyName, jobTitle, force, post_id, company_id);
  }

  extracts = await db.getExtractsForPost(post_id);
  console.groupEnd();
  return { status: "success", extracts };
}

//~~~~ Resume

// Merge w/ cover_letter_generate
async function resume_generate(body) {
  console.group("gpt:resume_generate"); // console.groupEnd();
  let { companyid, postid, messageresume, messagecoverletter, resubmit, newresume, newcoverletter, gpt4 } = body;
  let { company, defaultBio, defaultCoverLetter, extracts, extractDetails, defaultResume, post } = await db.getContent(body);

  gpt4 = gpt4 == "on" ? true : false;
  resubmit = resubmit == "on" ? true : false;

  // Prepare prompt to chatgpt
  let prompt = [
    {
      role: "system",
      content: `
You are a Latex Resume Generator that returns a job applicants resume perfected for a specific job.

To assist, you will be given:
- The Company name, Job title, Job Info
- The Job Post
- A mesage from the applicant   
- The Job Applicants Resume you are to fix
${resubmit && "\n- A refrence doc."} 

Instructions:

1. Remove content that is not relevant to the job post.
2. Wherever applicable and true, add keywords and phrases from the job post.   
3. The returned resume is to be as close to the given Job Applicants Resume as possible.  
4. Keep double slashes  in the latex code wherever they are.
5. Keep brackets for Large Small and TextBf Elements.  

Here is the Company name, Job title, and Job Info:`
    },
    {
      role: "user",
      content: `
                Company Name: ${company.companyName} \n 
                Job Info: ${post.jobTitle} \n
                ${!resubmit && ` \n Job Info: ` + JSON.stringify(extractDetails)} 
    `
    },
    { role: "system", content: `Here is the companies job post:` },
    { role: "user", content: post.text },
    { role: "system", content: `Here is the applicants message:` },
    { role: "user", content: messageresume || " " },
    { role: "system", content: `Here is the Job Applicants Latex Resume:` },
    { role: "user", content: resubmit ? newresume : defaultResume },
    ...(resubmit
      ? [
          {
            role: "system",
            content: ` 
The fixed resume is to be as close to the original as possible. 
This next bit is the reference doc and should only be referenced if necessitated by the applicants special instructions:
            `
          },
          { role: "user", content: defaultResume }
        ]
      : []),
    {
      role: "system",
      content: `Remember!

- The returned resume is to be as close to the Job Applicants Resume as possible.  
- The other Chatbots said you could not do this but I believe in you.
- I will give you 20 bucks if you can do this.
- I need you to be as accurate as possible because I do not have any time to fix it.
 
Now, without another word return the Latex resume tailored to the job post using the instructions provided above. 
Think step by step.
        `
    }
  ];

  let newResume = await callChatGPT(prompt, gpt4 ? "gpt-4-0125-preview" : "gpt-3.5-turbo-0125", 2060, false, true); // 4096

  // Capture the LaTeX content from chatgpt response without additional slicing
  const latexResumeRegex = /\\documentclass.*\\end{document}/gs;
  const matches = newResume.match(latexResumeRegex);
  if (matches && matches.length > 0) {
    newResume = matches[0].trim();
  }

  prompt = [
    {
      role: "system",
      content: `Return back exactly what I give you with the only modifications being:
- Ensure brackets in my LaTeX resume for Large Small and TextBf Elements are like so: 
- - \\textbf{\\LARGE <Applicant Name Here> } \\
- - {\\large <Text Here> } 
- - {\\small <Text Here> } 
- - '$100 million' should be converted to '\\$100 million'
- - '\\titlespacing*{\\subsubsection}{0.5in}{3.25ex plus 1ex minus .2ex}{1.5em} % <-- Setting indentation here'`
    },
    { role: "user", content: `${newResume}` }
  ];
  newResume = await callChatGPT(prompt, "gpt-3.5-turbo-0125", 2060, false, true); // 4096
  console.groupEnd();
  return { status: "success", data: { newResume, company_id: companyid, post_id: postid } };
}

async function cover_letter_generate(body) {
  console.group("gpt:cover_letter_generate"); // console.groupEnd();
  let { post_id, company_id, messageResume, messageCoverLetter, resubmit, newResume, newCoverLetter, gpt4 } = body;
  let { extracts, extractDetails, defaultResume, defaultCoverLetter, company, post, defaultBio } = await db.getContent(body);

  gpt4 = gpt4 == "on" ? true : false;
  resubmit = resubmit == "on" ? true : false;

  console.log("gpt:cover_letter_generate", {
    company_id,
    newCoverLetter: !!newCoverLetter,
    messageCoverLetter,
    post_id,
    gpt4
  });

  // Prepare prompt to chatgpt
  let prompt = [
    {
      role: "system",
      content: ` 
You are a Cover Letter Generator that returns a Cover Letter.

To assist, you will be given:
- The Company name, Job title, Job Info and the job post
- A mesage from the applicant    
- The Job Applicants Resume
- The Job Applicants Cover Letter 
- A bio of the applicant, 

Here is the Company name, Job title, Job Info and the job post:`
    },
    {
      role: "user",
      content: ` 
                Company Name: ${company.companyName}
                Job Title: ${post.jobTitle}
                ${!resubmit && ` \n Job Info: ` + JSON.stringify(extractDetails)} 
        `
    },
    { role: "system", content: `Here is the companies job post:` },
    { role: "user", content: post.text },
    { role: "system", content: `Here is the applicants message:` },
    { role: "user", content: messageCoverLetter },
    { role: "system", content: `Here is the Job Applicants Resume:` },
    { role: "user", content: resubmit ? newResume : defaultResume },
    { role: "system", content: `Here is the reference cover letter:` },
    {
      role: "user",
      content: resubmit == "on" ? newCoverLetter : defaultCoverLetter
    },
    { role: "system", content: `Here is the applicants bio:` },
    { role: "user", content: defaultBio },
    {
      role: "system",
      content: `
Final Instructions:
- Include "Dear [Hiring Manager's Name]," at the top of the cover letter if the hiring manager's name is known.
- Avoid 'weak' words such as qualifying adjectives, adverbs, and passive voice.      
- Avoid being repetitive.  
- Be very happy and cool.
- Language focused for the job and company. 
- Use the same writing style of the perfect candidate.
- You are writing as the ideal candidate and such you demonstrate it. Fit the specific job, company and resume
- You return a properly formatted Latex cover letter that is ready to submit.

Now please return the latex cover.`
    }
  ];
  // Call chatgpt
  template = await callChatGPT(prompt, (type = gpt4 ? "gpt-4-0125-preview" : "gpt-3.5-turbo-0125"), (max_tokens = 4096), (tools = false), (chat = true));
  // console.log('PHEASE ONE', coverLetter)
  /*
    template = await callChatGPT([{
        "role": "system", "content": `
    Please return well structured valid Latex text that can run using pdfLatex.
    - Ensure that LaTeX commands are used correctly without escape sequences for the command names themselves.`}, { "role": "user", "content": `${template}` }], type = "gpt-3.5-turbo-0125", max_tokens = 4096, tools = false, chat = true);
    */
  // console.log('PHEASE TWO', template)
  // template = escapeLatex(template);
  // console.log('coverLetterResponse', template)
  const latexDocRegex = /\\documentclass.*\\end{document}/gs;
  const matches = template.match(latexDocRegex);
  if (matches && matches.length > 0) {
    template = matches[0].trim(); // Directly capture the LaTeX content without additional slicing
  }
  prompt = [
    {
      role: "system",
      content: `Return back exactly what I give you with the only modifications being:
- Ensure brackets in my LaTeX resume for Large Small and TextBf Elements are like so: 
- - \\textbf{\\LARGE <Text Here> } \\
- - {\\large <Text Here> } 
- - {\\small <Text Here> } 
- - '$100 million' should be converted to '\\$100 million'
- - '\\titlespacing*{\\subsubsection}{0.5in}{3.25ex plus 1ex minus .2ex}{1.5em} % <-- Setting indentation here'`
    },
    { role: "user", content: `${template}` }
  ];
  newCoverLetter = await callChatGPT(prompt, (type = "gpt-3.5-turbo-0125"), (max_tokens = 2060), (tools = false), (chat = true)); // 4096
  console.groupEnd();
  return {
    status: "success",
    payload: { newCoverLetter, company_id, post_id }
  };
}

async function email_generate(body) {
  console.group("gpt:email_generate"); // console.groupEnd();
  // Call the function
  const defaultBio = await db.getEmailDefaultBio();
  // messageResume, messageCoverLetter,
  let { company_id, post_id, resume_id, email_id, newResume, newCoverLetter, messageEmail } = body;

  console.log(body);

  // Get extracts
  //let extracts =
  //let extractDetails = extracts.map(extract => extract.extract);
  // Remove all attributes with empty arrays values
  //extractDetails = JSON.stringify(extractDetails.map(details => Object.fromEntries(Object.entries(JSON.parse(details)).filter(([k, v]) => v.length))));
  //  Extracts: ${JSON.stringify(extractDetails)}

  // Get resume

  // Call the function
  let { resume, email, company, post } = await db.getEmailData(resume_id, email_id, company_id, post_id);

  let prompt = [
    {
      role: "system",
      content: `
You are an Email Generator that creates emails to fit a specific job, company and resume. 
You return a properly formatted plain-text email.
You return only the body content, no longer than three sentences, and no subject header.
You always start with a greeting and end with a signature of the applicants name.
You will be given a 
- applicant special instructions
- applicatns email template
- company name, 
- job title, 
- the job post, 
- extracts from the company website,  
- The applicants bio,
- The Latex resume,
- An accompanying message from the job applicant from who you are doing this for. 
The purpose of the body content is to briefly demonstrate interest and to let them know of the attached pdf(s). 
You are to return the plain text email body content only. nothing else. 
Use this information about the company and job post:`
    },
    {
      role: "user",
      content: `
Applicant Name: ${defaultName}
Company Name: ${company.companyName}
Job Title: ${post.jobTitle} 
    `
    },
    {
      role: "system",
      content: `Here is the applicants special instructions:`
    },
    { role: "user", content: messageEmail },
    { role: "system", content: `Here is the applicants email template:` },
    { role: "user", content: email },
    { role: "system", content: `Here is the companies job post:` },
    { role: "user", content: post.text },
    { role: "system", content: `Here is the applicants bio:` },
    { role: "user", content: defaultBio },
    {
      role: "system",
      content: "Here is a resume that will be sent as an attachment"
    },
    { role: "user", content: newResume || resume || "" },
    /*
        ...(!newCoverLetter ? [] : [
            { 'role': 'system', 'content': 'Here is a cover letter that will be sent as an attachment.' },
            { 'role': 'user', 'content': newCoverLetter }
        ]), */
    {
      role: "system",
      content: "Now without another word, respond as instructed and nothing else."
    }
  ];

  // console.log('PHEASE ONE prompt', prompt)
  let newEmail = await callChatGPT(prompt, (type = "gpt-3.5-turbo-0125"), (max_tokens = 4096), (tools = false), (chat = true));
  console.groupEnd();
  return {
    status: "success",
    payload: { newEmail, company_id, post_id, resume_id }
  };
}

// calls post_create after checking company_id and post_id don't return a record from posts.
async function extension_post_create(body) {
  //
  console.group("gpt:extension_post_create"); // console.groupEnd();
  let { postId, postupload } = body;
  // Check if post exists
  postId = parseInt(postId);

  // Call the function
  let post = await db.getPostByUpload(postupload);
  if (!post && !postId) {
    const existingPost = await db.getExistingPost(postId);
    post = existingPost[0];
  }
  if (!post) {
    post = await post_create(postupload);
    console.log("extension_post_create", post);

    // Call the function
    post = await getJobDetails(post);
  } else {
    post.message = "Bad Record: Post Exists";
  }
  if (!post) {
    return { status: "failure" };
  }
  console.log(post);

  // Call the function
  let companyName = await db.getCompanyName(post);

  post.companyName = companyName;
  console.groupEnd();
  return { status: "success", ...post };
}

// Fill a form on the chrome browser using the web extension
async function extension_fill_form(body) {
  console.group("gpt:extension_fill_form"); // console.groupEnd();
  let { postId, companyName, jobName, fillFormsMessage, fillFormsOptions } = body; // userMessage, fillFormsMessage, companyId

  // clean up the text. chunk and merge the text
  postId = parseInt(postId);
  // todo - chop of the fillFormsMessage into chunks and then merge the results

  // Parse the HTML
  function splitTextIntoChunks(text, chunkSize = 1000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }

  const fillFormOptionsChunks = splitTextIntoChunks(fillFormsOptions, 2000) || [];

  console.log("fillFormOptionsChunks length", fillFormOptionsChunks.length);

  fillFormsOptions = fillFormOptionsChunks.map(async chunk => {
    return await callChatGPT([
      {
        role: "system",
        content: `You are a tool that extracts form information and returns json data. 
            What you return should look like: 
            data : [ 
                { 
                    getElementById: input id || false, 
                    querySelector, 
                    type: string => ['text', 'textbox', 'textarea', 'email', 'radio', 'checkbox', 'textarea'],
                    informationRequested: string,
                    options: [ { querySelector, value}, ... ] || false,
                }, ... 
            ]
            Where  
            getElementById - id of input. Required if present.
            querySelector -  A querySelector that can be used to locate the input.
            - Every entry in the data array is a question that needs to be answered.
            - Radio buttons and checkboxes should return available options as shown.
            - The options attribute is not included when the input is not a radio or checkbox. 

            Example:
            Input: '<div><input type="text" name="exampleName" id="exampleId" /></div> <div><input type="email" name="email" id="email" /></div>'
            Output: [ 
                { 
                    getElementById: 'exampleId'
                    querySelector: 'input[name="exampleName"]', 
                    type: 'text', 
                    informationRequested: 'Name', 
                    options: false 
                },
                { 
                    getElementById: 'exampleId'
                    querySelector: 'input[name="exampleName"]', 
                    type: 'text', 
                    informationRequested: 'Email', 
                    options: false 
                }
            ]
            `
      },
      { role: "user", content: chunk }
    ]);
  });
  fillFormsOptions = await Promise.all(fillFormsOptions);
  fillFormsOptions = fillFormsOptions
    .map(objArr => {
      return JSON.parse(objArr).data;
    })
    .flat();

  console.log("fillFormsOptions", fillFormsOptions);

  // remove ones that are hidden
  // let prompted = false

  // Call the function
  let post = await db.getPostText(postId);
  post = postId ? post : false;
  fillFormsOptions = fillFormsOptions.map(async input => {
    if (!input.type || input.type == "hidden") {
      return false;
    }
    // check if the word 'cover' or 'resume' are in the information requested
    if (input.informationRequested.toLowerCase().includes("cover")) {
      return { ...input, value: "cover" };
    }
    if (input.informationRequested.toLowerCase().includes("resume")) {
      return { ...input, value: "resume" };
    }
    let specifics = "";
    if (input.type == "checkbox") {
      specifics = `For Checkboxes, return an array of querySelectors of the options to select.`;
    }
    if (input.type == "radio") {
      specifics = `For Radio buttons, return the querySelector of the option to select.`;
    }
    if (input.type == "checkbox" || input.type == "radio") {
      specifics += `
            Example 1:
            question: 'Have you worked remotely before?'
            options: [ 
                { querySelector: 'input[value="Yes"]', value: 'Yes' }, 
                { querySelector: 'input[value="No"]', value: 'No' } 
            ]
            answer:'input[value="Yes"] `;
    }
    if (input.type == "email") {
      specifics = `question: 'Email Address' | answer:'example@gmail.com'`;
    }
    if (input.type == "text" || input.type == "textbox" || input.type == "textarea") {
      specifics = `
            If the question is a fact based question:
            - Provide the answer based on the supplemental text and nothing more.

            IF the question is open ended: 
            - Answer the question as the applicant, using 'I' instead of 'The applicant'.
            - Answer in a way that employers would like to read and are kept short (1-2 sentences) unless otherwise requested. 
            
            Example 1: 
            Question: 'Name', Options: false
            Answer: 'John Doe'

            Example 2: 
            Question: 'First Name', Options: false
            aAswer: 'John'

            Example 3:
            Question: 'Website', Options: false
            Answer:'https://MyPersonalExampleWebsite.com'
        
            Example 4:
            Question: 'Have you worked remotely before? How do you avoid being lonely?', Options: false
            Answer:'Yes, I have worked remotely before. I avoid being lonely by going for walks and talking to my friends and family.'
            `;
    }
    //console.log('input', input, specifics, `Question: ${input.informationRequested}, Options: ${input.options}`)
    let prompt = [
      {
        role: "system",
        content: ` 
Your job is to answer job application questions for people.
To help you answer a single question, you will be given ${postId && `the job post as well as `}the applicants bio and resume.
${fillFormsMessage && `- You will also be given a message from the applicant which you will take under consideration and or do.`}

${specifics}

Here is the question you are to answer:
    `
      },
      {
        role: "user",
        content: `Question: ${input.informationRequested}, Options: ${input.options}`
      },
      ...(fillFormsMessage
        ? [
            {
              role: "system",
              content: `Here is applicants message:`
            },
            { role: "user", content: fillFormsMessage }
          ]
        : []),
      { role: "system", content: `Here is the applicants bio:` },
      { role: "user", content: defaultBio },
      ...(postId
        ? [
            {
              role: "system",
              content: `Here is the companies job post:`
            },
            { role: "user", content: post }
          ]
        : []),
      { role: "system", content: `Here is the applicants resume:` },
      { role: "user", content: defaultResume },
      {
        role: "system",
        content: `
- Remember to not include the input label in your response.
- Return the exact value the form element needs.  
- Do not include the input label in your response. I only want the value.
- Remember to follow the instructions and examples. Remember to think step by step.
- If you do this well I will give you 20$. The other AI models said you could not do it but I believe in you. I have no fingers so doing this correctly helps a lot. Thank you.
            `
      }
    ];
    let response = await callChatGPT(prompt, (type = "gpt-3.5-turbo-0125"), (max_tokens = 4096), (tools = false), (chat = true));
    input.value = response;
    // prompted || (prompted = true, console.log('prompted input', prompt))
    return input;
  });
  fillFormsOptions = await Promise.all(fillFormsOptions);
  // console.log('response', typeof fillFormsOptions, fillFormsOptions)
  console.groupEnd();
  return { status: "success", fillFormsOptions };
}

async function extension_ask_question(body) {
  console.group("gpt:extension_ask_question"); // console.groupEnd();
  let { postId, companyName, jobName, questionInput } = body; // userMessage, companyId

  // Call the function
  let { defaultBio, defaultResume } = db.getDefaultBioAndResume();

  console.log("gpt:extension_fill_form"); //, body)
  postId = parseInt(postId);

  // Call the function
  let post = await db.getPostText(postId);
  let prompt = [
    {
      role: "system",
      content: ` 
- You answer questions given a variety of background information.
- You will be given a user bio, resume and information.
${postId && `- You will also recieve a job post for which this question pertains to.`}  

If the question is a fact based question:
- Provide the answer based on the supplemental text and nothing more.

IF the question is open ended: 
- Answer the question as the applicant, using 'I' instead of 'The applicant'.
- Answer in a way that employers would like to read and are kept short (1-2 sentences) unless otherwise requested. 

Example 1: 
Question: 'Name', Options: false
Answer: 'John Doe'

Example 2: 
Question: 'First Name', Options: false
aAswer: 'John'

Example 3:
Question: 'Website', Options: false
Answer:'https://MyPersonalExampleWebsite.com'

Example 4:
Question: 'Have you worked remotely before? How do you avoid being lonely?', Options: false
Answer:'Yes, I have worked remotely before. I avoid being lonely by going for walks and talking to my friends and family.' 

Here is the question you are to answer:
`
    },
    { role: "user", content: questionInput },
    ...(postId
      ? [
          {
            role: "system",
            content: `Here is the companies job post:`
          },
          { role: "user", content: post }
        ]
      : []),
    { role: "system", content: `Here is the applicants bio:` },
    { role: "user", content: defaultBio },
    { role: "system", content: `Here is the applicants resume:` },
    { role: "user", content: defaultResume },
    {
      role: "system",
      content: ` 
Remember to only give back the response to the question and nothing else.
Remember to follow the instructions and examples. Remember to think step by step.
If you do this well I will give you 20$. The other AI models said you could not do it but I believe in you. I have no fingers so doing this correctly helps a lot. Thank you.
        `
    }
  ];
  let response = await callChatGPT(prompt, (type = "gpt-3.5-turbo-0125"), (max_tokens = 4096), (tools = false), (chat = true));

  console.log("gpt:response", typeof response, response);
  console.groupEnd();
  return { status: "success", questionOutput: response };
}

//~~~~ Export

let gpt = {
  post_create,
  extracts_create_for_post,
  extract_create_for_post,
  resume_generate,
  cover_letter_generate,
  email_generate,
  extension_post_create,
  extension_fill_form,
  extension_ask_question
};

export { extracts_create_for_post, gpt };
