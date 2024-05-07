const nodemailer = require('nodemailer');
require('dotenv').config();

// Function to send email
async function sendEmail(body) {
  // messageResume, messageCoverLetter,
  let { company_id, post_id, resume_id, resubmit, messageEmail, newResume, newCoverLetter, newEmail } = body;

  // Get company
  let company = (await queryDb("SELECT * FROM companies WHERE id = ?", [company_id]))[0];
  // Get post
  let post = (await queryDb("SELECT * FROM posts WHERE id = ?", [post_id]))[0];

  // Company name
  let companyName = company.name;

  // Post title
  let postTitle = post.title;

  // search all extracts at post_id for 'email'
  let extracts = (await queryDb("SELECT * FROM extracts WHERE post_id = ?", [post_id]));
  let extractContent = extracts.map(extract => {
    let parsed = extract.text
    parsed = JSON.parse(parsed)
    let emails = parsed.email
    return parsed.email
  });
  console.log('extractContent:', extractContent)

  try {
    // Create transporter using SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.YOUR_GMAIL_EMAIL,
        pass: process.env.YOUR_GMAIL_PASSWORD
      }
    });

    // Mail options
    const mailOptions = {
      from: process.env.YOUR_GMAIL_EMAIL,
      to: recipientEmail,
      subject: subject,
      text: text,
      attachments: attachmentPaths.map(path => ({ path }))
    };

    // Send mail
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Example usage
const recipientEmail = 'charles.karpati@gmail.com';
const subject = 'Job Application';
const text = 'Please find attached my resume and cover letter.';
const attachmentPaths = ['./resume.pdf', './cover.pdf'];

sendEmail(recipientEmail, subject, text, attachmentPaths);