const { createJobRecordsFromcompanyRecord } = require('../utils/record_job');
const { createCompany } = require('../utils/record_company');
const jobPost9 = `
Merantix | Berlin, Germany (or remote) | Full-time | Co-Founder & CTO
Together with Merantix (a leading Berlin-based AI venture studio), we are building the future of the legal system. In today's world, more people have access to the internet than access to justice. The advent and rapid advancement of large language models offer an unprecedented opportunity to disrupt the legal sector. Our goal is to empower every claim owner to execute on their rights.

With over 10 years of litigation experience behind our backs, we have a unique insights in the field. After over 300 interviews we also have thoroughly validated AI use-cases in the legal industry. The initial idea is building an AI-powered legal operations platform, which automatically handles legal queries and claims. We have already developed a functioning prototype and secured first pilots with global insurance companies. Now, we're looking for a cofounder & CTO who will driv e technical development, help us refine and product and onboard first customers.

You can find more information and apply here: https://merantix.jobs.personio.de/job/1164421?display=en.  

We write a lot of Go, Java, Python, Typescript (with React), and a bit of other languages. We run on k8s, and are multi-region and multi-cloud.

Any questions? Reach out at viktor@merantix.com with "HN: Who is Hiring" in the email subject line and a small introduction.
`;
const jobPost12 = `
Datadog | Software Engineers | ONSITE (Boston, Lisbon, Madrid, NYC, Paris, Tel Aviv) and (some) REMOTE | Full-time
Datadog is a monitoring, tracing, logs system, and more, for your infrastructure and services. 
We build our own tsdb, event store [1][2], distributed tracing tools, 
cutting edge visualizations, and more. We love shipping great experiences for customers just like us and are growing fast! We write a lot of Go, Java, Python, Typescript (with React), and a bit of other languages. We run on k8s, and are multi-region and multi-cloud.

We're looking for people who can build systems at scale as we process trillions of events per day. Let us know if that's you!

https://dtdg.co/hnwhoshiring

[1] https://www.datadoghq.com/blog/engineering/introducing-husky

[2] https://www.datadoghq.com/blog/engineering/husky-deep-dive
`;

let posts = [jobPost9]; //, jobPost12];

(async () => {
    const promises = posts.map(async (post) => {
        let companyRecord = await createCompany(post);
        companyRecord.companyPost = post;
        return createJobRecordsFromcompanyRecord(companyRecord);
    });

    // const JobPostRecords = await Promise.all(promises);

    // console.log('JobPostRecords', JobPostRecords);
})();