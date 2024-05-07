const {sendEmail} = require('../utils/sendMail')

// Call the function with dynamic values
// 
let text = 'Hello world?'
// plain text emails get first text, then html sites get second text
sendEmail(
  'charleskarpati@gmail.com', // Replace with the recipient email address
  'Hello ✔',
  text,
  `<b>${text}</b>`
);
