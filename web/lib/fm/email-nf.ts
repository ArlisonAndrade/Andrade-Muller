import nodemailer from "nodemailer";

// E-mail das NFS-e — o mesmo que a Franciele manda desde dez/2025 (e que
// relatorios/enviar_nfs.ps1 manda desde 01/out/2026): um e-mail por
// destinatário, assunto "NF - Referente a <Mês>", texto fixo e os PDFs
// ORIGINAIS em anexo, como application/pdf e com o nome original.
//
// Conta: gmgestaoestrategica@gmail.com via SMTP do Gmail com senha de app —
// variáveis GMAIL_USUARIO e GMAIL_SENHA_APP (Vercel / web/.env.local).

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const assuntoNf = (competencia: string) => `NF - Referente a ${MESES[Number(competencia.slice(5, 7)) - 1]}`;

function saudacao() {
  // A Vercel roda em UTC; a saudação segue o relógio de Porto Alegre.
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  return hora < 12 ? "Bom dia" : "Boa tarde";
}

export function corpoNf(contato: string | null) {
  const nome = contato ? ` ${contato}` : "";
  return (
    `<div dir="ltr">${saudacao()}${nome},<div><br></div><div>Seguem em anexo as notas fiscais.</div>` +
    `<div><br></div><div><br></div><div>Atenciosamente,</div><div><strong>Franciele Muller Guimarães</strong>` +
    `<br>Consultora em Estratégia Institucional e Inteligência Comercial.</div></div>`
  );
}

export function envioConfigurado() {
  return Boolean(process.env.GMAIL_USUARIO && process.env.GMAIL_SENHA_APP);
}

export async function enviarEmailNf(opcoes: {
  para: string;
  contato: string | null;
  competencia: string;
  anexos: Array<{ nome: string; bytes: Uint8Array }>;
}) {
  const usuario = process.env.GMAIL_USUARIO;
  const senha = process.env.GMAIL_SENHA_APP?.replace(/\s/g, "");
  if (!usuario || !senha) throw new Error("Envio não configurado: faltam GMAIL_USUARIO e GMAIL_SENHA_APP.");

  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    requireTLS: true,
    auth: { user: usuario, pass: senha },
  });

  await transporte.sendMail({
    from: { name: "Franciele Muller", address: usuario },
    to: opcoes.para,
    subject: assuntoNf(opcoes.competencia),
    html: corpoNf(opcoes.contato),
    attachments: opcoes.anexos.map((a) => ({
      filename: a.nome,
      content: Buffer.from(a.bytes),
      contentType: "application/pdf",
    })),
  });
}
