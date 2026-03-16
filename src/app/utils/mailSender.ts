import config from '@app/config/index.js';
import nodemailer from 'nodemailer'; 

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[] = [],
) => {
  console.log({
    user: config.nodemailer_host_email,
    pass: config.nodemailer_host_pass,
  });
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com.',
    port: 587,
    secure: config.NODE_ENV === 'production',
    auth: {
      // TODO: replace `user` and `pass` values from <https://forwardemail.net>
      user: config.nodemailer_host_email,
      pass: config.nodemailer_host_pass,
    },
  });

  await transporter.sendMail({
    from: 'nurmdopu428@gmail.com', // sender address
    to, // list of receivers
    subject,
    text: '', // plain text body
    html, // html body
    attachments,
  });
};
