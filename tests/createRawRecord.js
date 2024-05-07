const { createCompany } = require('../utils/record_company');
const { scrapeLinks, scrapeLink } = require('../utils/scrape');
const { callChatGPT } = require('../utils/callChatGPT');
const { queryDb } = require('../utils/db');

const jobPost1 = `
FUTO | https://futo.org | Austin, TX or Remote | Full time and interns
FUTO is an organization dedicated to the development of software that returns control of computers and technology to the people. We’re particularly interested in giving people more privacy and control from big tech. We also give grants to open source projects in line with our mission (see our site).

Bare metal software/systems engineer - https://futo.org/jobs/baremetal-engineer/

UI/UX designer - https://futo.org/jobs/ui-ux-designer/

Release engineer - https://futo.org/jobs/release-engineer/

Interns - email jobs {at} futo.org
`;
const jobPost2 = `
  Upnext | 100% Remote | Full Time / Contract | Software Eng / Design / ML
  At Upnext, we are passionate about solving information overload. Every day we get bombarded with content from social networks, news sites, blogs, messages, etc. It’s hard to keep up and it’s even harder to find the content that really matters to you. It takes time and energy to sift through the noise and find what really matters. That's why we created Upnext, our flagship product that lets users easily organize reading, audio, and video content in one neat space. We’re not stopping there, our latest app helps you stay up to date on the topics and news that you care about by aggregating updates into a single place. Using our own AI models we’re building in deep personalization from the beginning so Upnext users will always have the most important updates about topics they care about . We've got open roles for:

  - Software developers: our tech stack is TypeScript / Node / React / React Native

  - Designers: we're creating a seamless, beautiful experience across desktop, native and web

  - ML research / ML engineer: help us design build and deploy our first generation of recommendation and understanding systems

  - Marketing / growth: help us get the word out!

  If you'd like to chat, email me at joe [at] upnext [dot] in!
`
const jobPost3 = `
Struct.AI | Founding Frontend Engineer | 120K - 180K / year + 1%-2.5% equity | San Francisco, Remote (US timezone)
Chat platforms today are inherently broken. Slack and Discord, the most commonly used chat platforms, while useful for real-time communication, create knowledge black holes, hindering the effective storage and retrieval of information.

For the past 6 months, my team and I have been tirelessly building a new kind of chat platform – Struct.AI . Struct is reshaping the very concept of what a chat platform can be, reinventing chat. Struct is a unique combination of a chat platform for public communities (like Discord) and teams (like Slack). It tackles the hard job of marrying real-time chat with a thread-first approach to conversations while utilizing AI to generate context.

Join us on this exciting journey as we redefine communication. As a Founding Product Designer, you will play a vital role in shaping this innovative platform.

Tech Stack: Frontend is React / Typescript / Next.JS. Backend is Go / Postgres / Typesense. Using OpenAI APIs / intfloat/E5 for vector embeddings.

This is my second startup. It's a small team of 3, aiming to keep the team under 6 over the next 12 months. Previously founder of Dgraph Labs, which I ran for 6 years. Before that, spent 6 years in Google Web Search + Knowledge Graph Infra. You can reach out to me with a resume at manish [at] struct.ai

Let's reinvent chat together!
`
const jobPost4 = `
Figma | https://www.figma.com/ | San Francisco, New York City, and US remote | Full Time
Selected job postings here (all compensation in annual base salary range for SF/NY hubs):

- Engineering Director - Machine Learning ($280,000—$381,000 USD): https://boards.greenhouse.io/figma/jobs/4953079004

- Engineering Director - Server Platform ($282,000—$410,000 USD): https://boards.greenhouse.io/figma/jobs/4868741004

- ML/AI Engineer ($168,000—$350,000 USD): https://boards.greenhouse.io/figma/jobs/4756707004

- Software Engineer - FigJam ($168,000—$350,000 USD): https://boards.greenhouse.io/figma/jobs/4339815004

===

Born on the Web, Figma helps entire product teams brainstorm, create, test, and ship better designs, together. From great products to long-lasting companies, we believe that nothing great is made alone. Come make with us!

Figma recently made 200 fixes and improvements to Dev Mode: https://news.ycombinator.com/item?id=37226227

Keeping Figma fast — perf-testing the WASM editor: https://news.ycombinator.com/item?id=37324121
`
const jobPost5 = `
Temporal Technologies | Multiple positions in United States - WORK FROM HOME | FULL-TIME.
Temporal offers an entirely new way to build scalable and reliable applications. Temporal enables developers to focus on writing important business logic, and not on managing state or worrying about the underlying infrastructure. Sequoia Capital led our recent round of funding and our team has experience from start-ups and larger companies like Microsoft, Google, Amazon, Uber, and more.

Temporal Investors Expand Funding: https://temporal.io/news/temporal-investors-expand-funding-w...

Temporal in 7 minutes: https://temporal.io/tldr

We're looking for senior level engineers for multiple roles - see here - https://www.temporal.io/careers

FEATURED ROLES:

Senior Technical Curriculum Developer - Read more and apply here https://jobs.lever.co/temporal/a09daac8-f296-4330-a31b-59e56...

Senior Staff Distributed Systems Software Engineer (Tech Lead) - Read more and apply here https://jobs.lever.co/temporal/28a290fa-087f-447b-934c-2960e...

Senior Software Engineer - Read more and apply here https://jobs.lever.co/temporal/3700d106-ea0a-43b5-ae8e-589f3...

Developer Success Engineer - Read more and apply here https://jobs.lever.co/temporal/5d1ff2cc-b128-44d2-812b-6c0d5...

For all employees, we offer: competitive salary, stock options, fully covered premiums for medical, dental (and ortho), vision, and life insurance benefits, HSA, 401K, unlimited time-off, work from home perks, monthly wellness / food $ allowance, an access pass to a WeWork location if you so choose. Send resume to careers AT temporal.io or apply here https://www.temporal.io/careers/
`
const jobPost6 = `
Samsara | Multiple Roles | Full-time, 100% Remote OR Hybrid In-Person/WFH (US & Canada) | Apply here: https://grnh.se/766dab941us
Samsara is the pioneer of the Connected Operations Cloud, which allows businesses and organizations that depend on physical operations to harness IoT (Internet of Things) data to develop actionable business insights and improve their operations. Samsara operates in North America and Europe and serves more than 20,000 customers across a wide range of industries including transportation, wholesale and retail trade, construction, field services, logistics, utilities and energy, government, healthcare and education, manufacturing and food and beverage. Learn more about Samsara's mission to increase the efficiency, safety, and sustainability of the operations that power the global economy at www.samsara.com.

Open Positions: Senior Software Engineer (Infrastructure, API Platform, Full Stack), Senior Firmware Quality Engineer, Staff Engineer (Infrastructure Platform, Telematics), Senior Staff Engineer, Manager, Software Engineering, and more!
`
const jobPost7 = `
Crusoe | Onsite/Hybrid – SF, Denver, Chicago | Climate Tech, Cloud Compute, Distributed Systems, Crypto | https://www.crusoeenergy.com/
Crusoe is on a mission to align the future of computation with the future of the climate.

Data centers consume more than 1% of the world's electricity. We power data centers with stranded energy such as flare gas and underloaded renewables, so for every GPU hour you use on Crusoe Cloud, you're offsetting 0.5kg of CO2e, or approximately 4.4 metric tons over an entire year. The more compute you use, the more CO2 and other greenhouse gasses you offset.

Crusoe Cloud (https://crusoecloud.com/) offers the cleanest and lowest-cost GPU cloud computing solution in the world for workloads including graphical rendering, artificial intelligence research, machine learning, computational biology, therapeutic drug discovery, simulation and more.

Here's a quick video so you can see what the systems look like in action, flames and everything: https://www.youtube.com/watch?v=Rlt8k71Quqw

High Priority Open Roles: - Staff/Senior Site Reliability Engineer - Staff/Senior Infrastructure Engineer - Staff/Senior Software Engineer - Solutions Engineer

Full list of roles here: https://jobs.ashbyhq.com/Crusoe?utm_source=Hackernews Questions? Email: careers@crusoeenergy.com
`
const jobPost8 = `
Spacelift/OpenTofu | Remote | Europe/Americas | Full-time | Open Source Software Engineer
We're a VC-funded startup building an automation platform for Infrastructure-as-Code, adding a Policy-as-Code layer above it, in order to make IaC usable in bigger companies, where you have to take care of state consistency, selective permissions, a usable git flow, etc.

We are also one of the companies behind the OpenTofu[0] initiative and now hiring engineers to the OpenTofu core team. We're looking for self-sufficient mid-to-senior software engineers, ideally with experience maintaining open-source projects. Your work will be 100% OpenTofu-related.

You can apply here[1], if that sounds interesting to you!

[0]: https://opentofu.org

[1]: https://spacelift.teamtailor.com/jobs/3187873-open-source-en...
`
const jobPost9 = `
Merantix | Berlin, Germany (or remote) | Full-time | Co-Founder & CTO
Together with Merantix (a leading Berlin-based AI venture studio), we are building the future of the legal system. In today's world, more people have access to the internet than access to justice. The advent and rapid advancement of large language models offer an unprecedented opportunity to disrupt the legal sector. Our goal is to empower every claim owner to execute on their rights.

With over 10 years of litigation experience behind our backs, we have a unique insights in the field. After over 300 interviews we also have thoroughly validated AI use-cases in the legal industry. The initial idea is building an AI-powered legal operations platform, which automatically handles legal queries and claims. We have already developed a functioning prototype and secured first pilots with global insurance companies. Now, we're looking for a cofounder & CTO who will driv e technical development, help us refine and product and onboard first customers.

You can find more information and apply here: https://merantix.jobs.personio.de/job/1164421?display=en

Any questions? Reach out at viktor@merantix.com with "HN: Who is Hiring" in the email subject line and a small introduction.
`
const jobPost10 = `
Flight Works | Irvine, CA | Embedded C/C++ Software Engineer | Full-time, Intern | US-Person | ONSITE
Flight Works, Inc. is a growing OEM (Original Equipment Manufacturer) of advanced components and systems for aerospace, medical, and other applications. We are seeking a dynamic, result-focused, hands-on embedded software engineer to focus on the development of our space electronics products: controllers for brushless motors, valves, and sensors. Preferred qualifications include experience with high-reliability programming in C/C++ on ARM Cortex platforms, as well as experience with RTOSes.

The position provides the opportunity for exposure to many disciplines, systems, and technologies in a fast-paced environment, where you will be working with others in all aspects of the product development cycle, starting with our space products. We are currently producing hardware and software to go out to cislunar space!

We require applicants to be a “US Person” eligible to receive technical data controlled under the Export Administration Regulations (EAR) or the International Traffic in Arms Regulation (ITAR).

Apply here: https://www.flightworksinc.com/our-company/careers/ or email me at james.robertson _at_ flightworksinc.com
`
const jobPost11 = `
Unnamed Forum | San Francisco | Remote | Contract
(repost from September 2022 - pivoting back to this ...)

You may know me here as the owner and founder of rsync.net.

This is not a job posting for rsync.net. Rather, I am starting a new venture that involves creating a threaded discussion software very much like what we are using right here on HN.

The full job description, which is likely to be a contract position but could evolve into a full time development position, is here:

https://kozubik.com/forumjob.html

(yes, expired SSL cert and I don't care)
`
const jobPost12 = `
Datadog | Software Engineers | ONSITE (Boston, Lisbon, Madrid, NYC, Paris, Tel Aviv) and (some) REMOTE | Full-time
Datadog is a monitoring, tracing, logs system, and more, for your infrastructure and services. We build our own tsdb, event store [1][2], distributed tracing tools, cutting edge visualizations, and more. We love shipping great experiences for customers just like us and are growing fast! We write a lot of Go, Java, Python, Typescript (with React), and a bit of other languages. We run on k8s, and are multi-region and multi-cloud.

We're looking for people who can build systems at scale as we process trillions of events per day. Let us know if that's you!

https://dtdg.co/hnwhoshiring

[1] https://www.datadoghq.com/blog/engineering/introducing-husky

[2] https://www.datadoghq.com/blog/engineering/husky-deep-dive
`

// for posts: need to obtain
// canApplyUsingThisLink

/*
Contact the linkedin account. contact email in job post page

Apply here: https://www.flightworksinc.com/our-company/careers/ or email me at james.robertson _at_ flightworksinc.com
More info at https://wellfound.com/jobs/884165-senior-backend-engineer-no... or email your resume to backend-team@sigma360.com
Please direct any questions to the email address on our Jobs page.
Please email pluses-ponds0r@icloud.com for more information and please accept our apologies for the anonymous posting.
email calvin[at]spill[dot]chat for a more thorough job spec
Email me john@solreader.com to chat more.
Feel free to apply on the site or email me at andrew@bonside.com
Please get in touch with me if you're interested or have any questions — email in my profile!
Feel free to email your resume and a note over to rob+oct23@trunk.tools
Email work@genhealth.ai with your resume.
Email me at careers@connectly.ai or apply at https://jobs.lever.co/connectly
If you're interested, please share your info via https://jobs.lever.co/eleostech/629c95b5-2205-4d5e-af25-4ca5... or feel free to reach out to me directly if you have questions (email is in my about/bio).
Mention “hackernews” in your application/emails. I am the hiring manager for this role, feel free to email me directly with your CV or questions: stefan@withwellspring.com
Email me john@solreader.com to chat more.
If you'd like to chat, email me at joe [at] upnext [dot] in!
Questions? Email: careers@crusoeenergy.com
Email me at alan@druxia.com with your resume or apply at https://boards.greenhouse.io/applytodruxia/jobs/4982294004?g...
Email us at apply at fullcontext.ai!
Reach out to me via email if interested: Jaycee.Schwarz@prizeout.com
Send an email with your resume, questions or just to talk: jobs[at]emergex.ai
Feel free to drop me (audrey.wenjie@shopee.com) an email if you are interested
If interested email us at hiring at smarterdx dot com
Feel free to email me directly via david at singlestore dot com.
To apply, please email to jobs@helio.exchange. Traditional CVs or Cover letters are unnecessary.
You can email me directly to discuss the role: viktor@ivpn.net or apply here: https://ivpn.recruitee.com/o/technical-writer-privacy-securi...
If you are interested, please send your resume to sudeep.giri@equalexperts.com and include "HN: Who is Hiring" in the email subject line.
If you made it this far, and you'd like to get in touch, I can be contacted by email: jesse [at] lemurianlabs <dot> com
If you are interested email apply@faktory.com
Apply by emailing careers@buildwithfern.com Learn more: https://www.buildwithfern.com/careers
Please email together a t ourdomain
Find out more and apply at: https://mark43.com/list-job/?gh_jid=3733950 Email jon.dauch@mark43.com if interested
If interested, email hn [at] branchfurniture.com with a few sentences about you and your interest.
*/