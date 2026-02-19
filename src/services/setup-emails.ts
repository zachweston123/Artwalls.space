/**
 * @deprecated Dead service stub — emails not implemented. Do not import.
 * Intentionally a no-op: the throw was removed to prevent accidental build/runtime crashes.
 * This file is NOT wired to any production code path.
 *
 * Original email template code has been stripped. If email templates are needed
 * in the future, implement them as Worker-side logic (not client-side).
 */
export {};

    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1>Setup Received! 🎉</h1>
      
      <p>Hi there,</p>
      
      <p>Thank you for completing your <strong>${venueName}</strong> setup on Artwalls! 
      We've received your submission and our team is reviewing it now.</p>
      
      <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2>What Happens Next</h2>
        <ol>
          <li><strong>Review (1-2 days)</strong> - Our team reviews your venue information</li>
          <li><strong>Approval</strong> - You'll receive confirmation via email</li>
          <li><strong>Go Live</strong> - Your venue appears on the Artwalls platform</li>
          <li><strong>Earn</strong> - Start receiving artwork submissions and earning commissions</li>
        </ol>
      </div>
      
      <h3>In the Meantime</h3>
      <p>While your setup is being reviewed, you can:</p>
      <ul>
        <li>Review the <a href="https://artwalls.space/partner-kit">Partner Kit</a> for best practices</li>
        <li>Download and print your QR code</li>
        <li>Prepare staff to answer questions about the program</li>
        <li>Plan your wall layout and display spots</li>
      </ul>
      
      <h3>Questions?</h3>
      <p>If you have any questions, reply to this email or visit our 
      <a href="https://artwalls.space/support">support center</a>.</p>
      
      <p>Thanks for joining the Artwalls community!</p>
      <p><strong>The Artwalls Team</strong></p>
    </div>
  `;

  const text = `Setup Received!

Hi there,

Thank you for completing your ${venueName} setup on Artwalls! We've received your submission and our team is reviewing it now.

What Happens Next:
1. Review (1-2 days) - Our team reviews your venue information
2. Approval - You'll receive confirmation via email
3. Go Live - Your venue appears on the Artwalls platform
4. Earn - Start receiving artwork submissions and earning commissions

In the Meantime:
- Review the Partner Kit for best practices
- Download and print your QR code
- Prepare staff to answer questions about the program
- Plan your wall layout and display spots

Questions?
If you have any questions, reply to this email or visit our support center.

Thanks for joining the Artwalls community!
The Artwalls Team`;

  return { subject, html, text };
};

// ============================================================================
// SETUP_APPROVED - Email sent when venue is approved
// ============================================================================

export const generateSetupApprovedEmail = (venueName: string, venueId: string): EmailTemplate => {
  const subject = `🎉 Your Setup is Approved! Welcome to Artwalls, ${venueName}!`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1>You're Approved! 🚀</h1>
      
      <p>Hi there,</p>
      
      <p><strong>${venueName}</strong> is now live on Artwalls! 🎉</p>
      
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #28a745;">
        <h2>🟢 Status: APPROVED</h2>
        <p>Your venue setup has been approved and is now live!</p>
      </div>
      
      <h3>You're All Set! Here's What to Do:</h3>
      <ol>
        <li><strong>Display Your QR Code</strong> - Place it in high-traffic areas (poster, table tent, staff badge)</li>
        <li><strong>Brief Your Staff</strong> - Share the "Staff One-Liner" so they can answer customer questions</li>
        <li><strong>Prepare Your Wall</strong> - Set up your display spots according to your configuration</li>
        <li><strong>Start Receiving Art</strong> - Artists will soon submit work for your venue!</li>
      </ol>
      
      <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Quick Links</h3>
        <ul>
          <li><a href="https://artwalls.space/dashboard">View Your Dashboard</a></li>
          <li><a href="https://artwalls.space/qr/${venueId}">Download Your QR Code</a></li>
          <li><a href="https://artwalls.space/partner-kit">Read the Partner Kit</a></li>
          <li><a href="https://artwalls.space/support">Visit Support Center</a></li>
        </ul>
      </div>
      
      <h3>Economics Reminder</h3>
      <p>You'll earn a <strong>15% commission</strong> on every artwork sale from your venue:</p>
      <ul>
        <li><strong>\$200 artwork sale:</strong> You earn \$30, artist gets their tier share</li>
        <li><strong>Free Tier artists:</strong> Keep 60% after our fees</li>
        <li><strong>Starter artists:</strong> Keep 80% after our fees</li>
        <li><strong>Growth artists:</strong> Keep 83% after our fees</li>
        <li><strong>Pro artists:</strong> Keep 85% after our fees</li>
      </ul>
      
      <h3>Next Steps</h3>
      <p>Log into your <a href="https://artwalls.space/dashboard">dashboard</a> to:</p>
      <ul>
        <li>View incoming artwork submissions</li>
        <li>Track earnings and sales</li>
        <li>Manage your venue settings</li>
        <li>View analytics and performance</li>
      </ul>
      
      <p>Need help? Reply to this email anytime!</p>
      <p><strong>Welcome to the Artwalls community! 🎨</strong></p>
    </div>
  `;

  const text = `You're Approved! Welcome to Artwalls!

Hi there,

${venueName} is now live on Artwalls!

🟢 Status: APPROVED
Your venue setup has been approved and is now live!

You're All Set! Here's What to Do:
1. Display Your QR Code - Place it in high-traffic areas
2. Brief Your Staff - Share the Staff One-Liner
3. Prepare Your Wall - Set up your display spots
4. Start Receiving Art - Artists will soon submit work!

Quick Links:
- View Your Dashboard: https://artwalls.space/dashboard
- Download Your QR Code: https://artwalls.space/qr/${venueId}
- Read the Partner Kit: https://artwalls.space/partner-kit
- Visit Support Center: https://artwalls.space/support

Economics Reminder:
You'll earn a 15% commission on every artwork sale from your venue:
- \$200 artwork sale: You earn \$30, artist gets their tier share
- Free Tier artists: Keep 60% after our fees
- Starter artists: Keep 80% after our fees
- Growth artists: Keep 83% after our fees
- Pro artists: Keep 85% after our fees

Next Steps:
Log into your dashboard to:
- View incoming artwork submissions
- Track earnings and sales
- Manage your venue settings
- View analytics and performance

Need help? Reply to this email anytime!

Welcome to the Artwalls community! 🎨`;

  return { subject, html, text };
};

// ============================================================================
// SETUP_REJECTED - Email sent when venue setup is rejected
// ============================================================================

export const generateSetupRejectedEmail = (venueName: string, reason: string, notes?: string): EmailTemplate => {
  const subject = `Please Review Your Artwalls Setup - ${venueName}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1>Let's Refine Your Setup</h1>
      
      <p>Hi there,</p>
      
      <p>Thank you for submitting your <strong>${venueName}</strong> setup! 
      We reviewed it and would like you to make a few adjustments before we can approve it.</p>
      
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107;">
        <h2>Feedback</h2>
        <p><strong>Issue:</strong> ${reason}</p>
        ${notes ? `<p><strong>Details:</strong> ${notes}</p>` : ''}
      </div>
      
      <h3>What to Do</h3>
      <ol>
        <li>Log into your <a href="https://artwalls.space/dashboard">dashboard</a></li>
        <li>Navigate to "Setup Progress"</li>
        <li>Click "Resume Setup" to make the requested changes</li>
        <li>Review the feedback above and update accordingly</li>
        <li>Submit again for review</li>
      </ol>
      
      <h3>Common Reasons for Rejection</h3>
      <ul>
        <li><strong>Incomplete photos:</strong> We need at least 3 high-quality photos of your space</li>
        <li><strong>Missing information:</strong> Please fill in all required fields</li>
        <li><strong>Invalid details:</strong> Double-check your address and contact information</li>
        <li><strong>Photo quality:</strong> Photos should be well-lit and clearly show your venue</li>
      </ul>
      
      <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Need Help?</h3>
        <p>If you have questions about the feedback or need assistance, 
        <a href="https://artwalls.space/support">contact our support team</a>. 
        We're here to help!</p>
      </div>
      
      <p>We look forward to welcoming ${venueName} to the Artwalls community soon!</p>
      <p><strong>The Artwalls Team</strong></p>
    </div>
  `;

  const text = `Let's Refine Your Setup

Hi there,

Thank you for submitting your ${venueName} setup! We reviewed it and would like you to make a few adjustments before we can approve it.

Feedback:
Issue: ${reason}
${notes ? `Details: ${notes}` : ''}

What to Do:
1. Log into your dashboard
2. Navigate to "Setup Progress"
3. Click "Resume Setup" to make the requested changes
4. Review the feedback above and update accordingly
5. Submit again for review

Common Reasons for Rejection:
- Incomplete photos: We need at least 3 high-quality photos of your space
- Missing information: Please fill in all required fields
- Invalid details: Double-check your address and contact information
- Photo quality: Photos should be well-lit and clearly show your venue

Need Help?
If you have questions about the feedback or need assistance, contact our support team.
We're here to help!

We look forward to welcoming ${venueName} to the Artwalls community soon!

The Artwalls Team`;

  return { subject, html, text };
};

// ============================================================================
// Email Service - Send emails
// ============================================================================

export class SetupEmailService {
  private transporter: any;

  constructor(smtpConfig?: any) {
    // TODO: Configure with actual SMTP settings
    // For production, use SendGrid, Mailgun, or similar
    // For development, use nodemailer with test account
    
    this.transporter = null; // Will be initialized with proper config
  }

  async sendSetupSubmittedEmail(email: string, venueName: string): Promise<boolean> {
    try {
      const template = generateSetupSubmittedEmail(venueName);
      // TODO: Send email via transporter
      console.log(`[EMAIL] Setup submitted email to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending setup submitted email:', error);
      return false;
    }
  }

  async sendSetupApprovedEmail(email: string, venueName: string, venueId: string): Promise<boolean> {
    try {
      const template = generateSetupApprovedEmail(venueName, venueId);
      // TODO: Send email via transporter
      console.log(`[EMAIL] Setup approved email to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending setup approved email:', error);
      return false;
    }
  }

  async sendSetupRejectedEmail(email: string, venueName: string, reason: string, notes?: string): Promise<boolean> {
    try {
      const template = generateSetupRejectedEmail(venueName, reason, notes);
      // TODO: Send email via transporter
      console.log(`[EMAIL] Setup rejected email to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending setup rejected email:', error);
      return false;
    }
  }
}

// ============================================================================
// Queue-based email sending (for background jobs)
// ============================================================================

export interface EmailJob {
  id: string;
  type: 'setup_submitted' | 'setup_approved' | 'setup_rejected';
  to: string;
  venueName: string;
  venueId: string;
  reason?: string; // for rejections
  notes?: string; // for rejections
  createdAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

/**
 * Queue email job for later processing
 * Can be processed by background worker using Bull/Redis/etc
 */
export async function queueSetupEmail(job: EmailJob): Promise<string> {
  try {
    // TODO: Save to job queue (Redis, database, Bull queue, etc)
    // For now, just log
    console.log(`[QUEUE] Email job queued:`, job);
    return job.id;
  } catch (error) {
    console.error('Error queueing email:', error);
    throw error;
  }
}

/**
 * Process pending email jobs
 * Run this on a schedule (e.g., every minute) or on demand
 */
export async function processEmailQueue(): Promise<number> {
  try {
    // TODO: Fetch pending jobs from queue
    // TODO: Send emails
    // TODO: Mark as sent/failed
    // TODO: Log to setup_emails table
    console.log('[QUEUE] Processing email queue...');
    return 0; // number of emails sent
  } catch (error) {
    console.error('Error processing email queue:', error);
    return 0;
  }
}

export default SetupEmailService;
