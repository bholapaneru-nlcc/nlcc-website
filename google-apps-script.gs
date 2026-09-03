/**
 * NLCC Email Service — Google Apps Script
 * 
 * Deploy this as a Web App to send emails from classroom@nlccuk.com.
 * 
 * SETUP:
 * 1. Go to script.google.com → New project
 * 2. Delete the default code and paste this entire file
 * 3. Change SECRET below to a random string (match it in .env as VITE_EMAIL_SECRET)
 * 4. Run the setup() function once (grants Gmail permissions)
 * 5. Deploy → New deployment → Web app
 *    - Description: NLCC Email Service
 *    - Execute as: Me (classroom@nlccuk.com)
 *    - Who has access: Anyone
 * 6. Copy the Web App URL into .env as VITE_APPS_SCRIPT_URL
 */

// ⚠️ Change this to a random secret string — must match VITE_EMAIL_SECRET in .env
var SECRET = 'change-this-to-a-random-secret';

var FROM_NAME = 'Nepalese Language and Culture Centre (NLCC)';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Validate secret
    if (data.secret !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid secret.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Validate required fields
    if (!data.to || !data.subject || !data.body) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing required fields: to, subject, body.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Send the email
    var options = {
      name: FROM_NAME,
      to: data.to,
      subject: data.subject,
    };
    
    if (data.isHtml) {
      options.htmlBody = data.body;
    } else {
      options.body = data.body;
    }
    
    // If there's a replyTo field, add it
    if (data.replyTo) {
      options.replyTo = data.replyTo;
    }
    
    MailApp.sendEmail(options);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (for testing)
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'NLCC Email Service is running.'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Run this once to grant Gmail permissions
function setup() {
  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: 'NLCC Email Service — Setup Complete',
    body: 'The NLCC email service has been set up successfully. Emails will be sent from this account.',
    name: FROM_NAME
  });
  Logger.log('Setup complete. Check your email.');
}
