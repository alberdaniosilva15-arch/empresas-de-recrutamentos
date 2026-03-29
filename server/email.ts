import nodemailer from "nodemailer";

export const sendCandidateEmail = async (
  to: string,
  candidateName: string,
  status: string,
  jobTitle: string
) => {
  // Configuração do Transportador (Ex: Gmail, Outlook ou Resend)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"GoldTalent" <${process.env.SMTP_USER}>`,
    to,
    subject: `Atualização de Candidatura: ${jobTitle}`,
    text: `Olá ${candidateName}, o status da sua candidatura para ${jobTitle} foi atualizado para: ${status}.`,
    html: `<p>Olá <strong>${candidateName}</strong>,</p><p>O status da sua candidatura para <strong>${jobTitle}</strong> foi atualizado para: <strong>${status}</strong>.</p>`,
  };

  return transporter.sendMail(mailOptions);
};
