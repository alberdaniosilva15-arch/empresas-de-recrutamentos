import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BRAND_COLOR = '#D4AF37';
const SECONDARY_COLOR = '#050505';

const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: ${BRAND_COLOR}; }
    .logo span { color: #ffffff; }
    .content { background: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #64748b; }
    .button { display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Gold<span>Talent</span></div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} GoldTalent. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;

export const sendCandidateEmail = async (
  to: string,
  candidateName: string,
  status: string,
  jobTitle: string
) => {
  let subject = '';
  let content = '';

  switch (status) {
    case 'Novo':
      subject = `Recebemos sua candidatura para ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Olá, ${candidateName}!</h2>
        <p>Obrigado por se candidatar à vaga de <strong>${jobTitle}</strong> na GoldTalent.</p>
        <p>Sua candidatura foi recebida com sucesso e nossa equipe de recrutamento irá analisá-la em breve.</p>
        <p>Entraremos em contato caso seu perfil seja selecionado para as próximas etapas.</p>
      `;
      break;
    case 'Triagem':
      subject = `Atualização na sua candidatura: ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Olá, ${candidateName}!</h2>
        <p>Temos novidades sobre sua candidatura para <strong>${jobTitle}</strong>.</p>
        <p>Seu perfil avançou para a etapa de <strong>Triagem</strong>. Nossa equipe está analisando os detalhes da sua experiência.</p>
        <p>Fique atento ao seu e-mail para os próximos passos.</p>
      `;
      break;
    case 'Entrevista':
      subject = `Convite para Entrevista: ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Parabéns, ${candidateName}!</h2>
        <p>Seu perfil foi selecionado para a etapa de <strong>Entrevista</strong> para a vaga de <strong>${jobTitle}</strong>.</p>
        <p>Em breve, um de nossos recrutadores entrará em contato para agendar o melhor horário.</p>
        <p>Estamos ansiosos para conhecer você melhor!</p>
      `;
      break;
    case 'Teste Técnico':
      subject = `Próxima etapa: Teste Técnico para ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Olá, ${candidateName}!</h2>
        <p>Como parte do nosso processo seletivo para <strong>${jobTitle}</strong>, gostaríamos de convidar você para realizar um teste técnico.</p>
        <p>As instruções detalhadas serão enviadas em um e-mail separado nos próximos minutos.</p>
      `;
      break;
    case 'Proposta':
      subject = `Temos uma proposta para você! - ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Excelentes notícias, ${candidateName}!</h2>
        <p>Estamos muito impressionados com sua trajetória e gostaríamos de apresentar uma <strong>Proposta de Trabalho</strong> para a vaga de <strong>${jobTitle}</strong>.</p>
        <p>Nossa equipe entrará em contato em breve para discutir os detalhes.</p>
      `;
      break;
    case 'Contratado':
      subject = `Bem-vindo à equipe! - ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Bem-vindo a bordo, ${candidateName}!</h2>
        <p>É com muita alegria que confirmamos sua contratação para a vaga de <strong>${jobTitle}</strong>.</p>
        <p>Estamos muito felizes em ter você conosco. Prepare-se para uma jornada incrível na GoldTalent!</p>
      `;
      break;
    case 'Rejeitado':
      subject = `Atualização sobre o processo seletivo: ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Olá, ${candidateName}.</h2>
        <p>Agradecemos imensamente o seu interesse na vaga de <strong>${jobTitle}</strong> e por dedicar seu tempo ao nosso processo seletivo.</p>
        <p>No momento, decidimos seguir com outros candidatos cujos perfis estão mais alinhados com as necessidades específicas desta vaga.</p>
        <p>Manteremos seu currículo em nosso banco de talentos para futuras oportunidades.</p>
        <p>Desejamos muito sucesso em sua carreira!</p>
      `;
      break;
    default:
      subject = `Atualização na sua candidatura: ${jobTitle}`;
      content = `
        <h2 style="margin-top: 0;">Olá, ${candidateName}!</h2>
        <p>Sua candidatura para <strong>${jobTitle}</strong> foi atualizada para o status: <strong>${status}</strong>.</p>
      `;
  }

  try {
    if (!process.env.SMTP_HOST) {
      console.log('SMTP not configured, skipping email send.');
      console.log(`Email to ${to} [${subject}]: ${content.replace(/<[^>]*>?/gm, '')}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"GoldTalent" <noreply@goldtalent.com>',
      to,
      subject,
      html: getBaseTemplate(content),
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
