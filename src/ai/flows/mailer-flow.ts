
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

export async function sendEmail(input: MailerInput): Promise<void> {
  const settingsRef = doc(db, 'settings', 'mailerConfig');
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    throw new Error('Mailer configuration not found. Please set it up in the admin panel.');
  }
  const config = settingsSnap.data();

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
        // You can add personalization here if needed
        // html: input.body.replace('{{firstName}}', recipient.firstName),
      });
    } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        // We can decide to throw or continue. For a bulk mailer, continuing is often better.
    }
  }
}

const mailerFlow = ai.defineFlow(
  {
    name: 'mailerFlow',
    inputSchema: MailerInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    await sendEmail(input);
  }
);
