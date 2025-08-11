
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as nodemailer from 'nodemailer';

const EmailRecipientSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
});

const MailerInputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  recipients: z.array(EmailRecipientSchema),
});

export type MailerInput = z.infer<typeof MailerInputSchema>;

// The main exported function is now a direct call to the Genkit flow.
export async function sendEmail(input: MailerInput): Promise<void> {
  return mailerFlow(input);
}

// All logic is now correctly contained within the flow definition.
const mailerFlow = ai.defineFlow(
  {
    name: 'mailerFlow',
    inputSchema: MailerInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const settingsRef = doc(db, 'settings', 'mailerConfig');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      throw new Error('Mailer configuration not found. Please set it up in the admin panel.');
    }
    const config = settingsSnap.data();

    if (!config.host || !config.port || !config.user || !config.pass) {
        throw new Error('Mailer configuration is incomplete. Please check your settings.');
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port, 10),
      secure: parseInt(config.port, 10) === 465, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const mailOptions = {
      from: `"${config.fromName || 'Nexbattle'}" <${config.user}>`,
      subject: input.subject,
      html: input.body,
    };

    // Send emails sequentially to avoid rate-limiting issues
    for (const recipient of input.recipients) {
      try {
        await transporter.sendMail({
          ...mailOptions,
          to: recipient.email,
        });
      } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          // For a bulk mailer, we log the error but continue to the next recipient.
          // You could add more robust error handling here, like collecting failed emails.
      }
    }
  }
);
