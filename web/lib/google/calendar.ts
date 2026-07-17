// Camada de calendário: guarda a conexão em fm_google_integracao, renova o
// access token quando vence, e faz o CRUD de eventos + o pull incremental.
import { createClient } from "@/lib/supabase/server";
import {
  googleConfigurado,
  renovarAccessToken,
  emailDaConta,
} from "@/lib/google/oauth";
import type { Reuniao } from "@/lib/tipos";

const API = "https://www.googleapis.com/calendar/v3";
const TZ = "America/Sao_Paulo"; // o app trata horários como parede local (ver formato.ts)

export interface Integracao {
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  calendar_id: string;
  sync_token: string | null;
}

export async function lerIntegracao(): Promise<Integracao | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fm_google_integracao")
    .select("*")
    .limit(1)
    .maybeSingle();
  return (data as Integracao) ?? null;
}

export async function conectado(): Promise<boolean> {
  if (!googleConfigurado()) return false;
  const i = await lerIntegracao();
  return Boolean(i?.refresh_token);
}

// Retorna um access token válido, renovando e persistindo se estiver vencido.
async function accessTokenValido(): Promise<{
  token: string;
  calendarId: string;
} | null> {
  if (!googleConfigurado()) return null;
  const i = await lerIntegracao();
  if (!i?.refresh_token) return null;

  const venceEm = i.token_expiry ? new Date(i.token_expiry).getTime() : 0;
  // margem de 60s para não usar um token no fio do vencimento
  if (i.access_token && venceEm - Date.now() > 60_000) {
    return { token: i.access_token, calendarId: i.calendar_id };
  }

  const novo = await renovarAccessToken(i.refresh_token);
  const expiry = new Date(Date.now() + novo.expires_in * 1000).toISOString();
  const supabase = await createClient();
  await supabase
    .from("fm_google_integracao")
    .update({
      access_token: novo.access_token,
      token_expiry: expiry,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", true);
  return { token: novo.access_token, calendarId: i.calendar_id };
}

async function apiGoogle(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// --- mapeamento reunião → evento ------------------------------------------

// data_reuniao é uma "parede local" (ex.: 2026-07-15T14:30). Somamos 1h para
// o fim sem introduzir fuso, tratando os componentes como UTC neutro.
function maisUmaHora(paredeLocal: string): string {
  const [d, h] = paredeLocal.slice(0, 16).split("T");
  const [ano, mes, dia] = d.split("-").map(Number);
  const [hora, min] = h.split(":").map(Number);
  const t = Date.UTC(ano, mes - 1, dia, hora, min) + 3_600_000;
  return new Date(t).toISOString().slice(0, 16);
}

function corpoEvento(r: Reuniao) {
  const inicio = r.data_reuniao.slice(0, 16);
  const fim = maisUmaHora(inicio);
  const partes = [
    r.cliente ? `Cliente: ${r.cliente.empresa ?? r.cliente.nome_contato}` : null,
    r.tipo ? `Tipo: ${r.tipo}` : null,
    r.ata ? `\n${r.ata}` : null,
    r.decisoes_tomadas ? `\nDecisões: ${r.decisoes_tomadas}` : null,
    r.proximos_passos ? `\nPróximos passos: ${r.proximos_passos}` : null,
  ].filter(Boolean);
  return {
    summary: r.titulo,
    description: `${partes.join("\n")}\n\n— FM Gestão`,
    start: { dateTime: `${inicio}:00`, timeZone: TZ },
    end: { dateTime: `${fim}:00`, timeZone: TZ },
    status: r.status === "cancelada" ? "cancelled" : "confirmed",
  };
}

// --- push: reunião → Google ------------------------------------------------

// Cria/atualiza/remove o evento no Google para refletir a reunião.
// Retorna o gcal_event_id resultante (ou null se desvinculou/não conectado).
// Nunca lança: falha de Google não pode quebrar o salvamento da reunião.
export async function sincronizarEventoDaReuniao(
  r: Reuniao,
): Promise<{ gcalEventId: string | null; erro?: string }> {
  try {
    const cred = await accessTokenValido();
    if (!cred) return { gcalEventId: r.gcal_event_id ?? null };
    const { token, calendarId } = cred;
    const cal = encodeURIComponent(calendarId);

    // Cancelada: apaga o evento e desvincula.
    if (r.status === "cancelada") {
      if (r.gcal_event_id) {
        await apiGoogle(token, `/calendars/${cal}/events/${r.gcal_event_id}`, {
          method: "DELETE",
        });
      }
      return { gcalEventId: null };
    }

    const corpo = JSON.stringify(corpoEvento(r));

    // Já tem evento: atualiza.
    if (r.gcal_event_id) {
      const resp = await apiGoogle(
        token,
        `/calendars/${cal}/events/${r.gcal_event_id}`,
        { method: "PUT", body: corpo },
      );
      if (resp.ok) return { gcalEventId: r.gcal_event_id };
      // Evento sumiu no Google (404): cai para recriar abaixo.
      if (resp.status !== 404) {
        return { gcalEventId: r.gcal_event_id, erro: await resp.text() };
      }
    }

    // Cria novo.
    const resp = await apiGoogle(token, `/calendars/${cal}/events`, {
      method: "POST",
      body: corpo,
    });
    if (!resp.ok) {
      return { gcalEventId: r.gcal_event_id ?? null, erro: await resp.text() };
    }
    const ev = (await resp.json()) as { id: string };
    return { gcalEventId: ev.id };
  } catch (e) {
    return {
      gcalEventId: r.gcal_event_id ?? null,
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}

// Apaga o evento vinculado (usado ao excluir a reunião). Silencioso.
export async function removerEvento(gcalEventId: string): Promise<void> {
  try {
    const cred = await accessTokenValido();
    if (!cred) return;
    const cal = encodeURIComponent(cred.calendarId);
    await apiGoogle(cred.token, `/calendars/${cal}/events/${gcalEventId}`, {
      method: "DELETE",
    });
  } catch {
    // ignora — a reunião já foi excluída localmente
  }
}

// --- pull: Google → sistema ------------------------------------------------

interface EventoGoogle {
  id: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
}

// Puxa mudanças do Google e reflete em fm_reunioes usando sync incremental.
// Retorna um resumo do que aconteceu.
export async function puxarDoGoogle(): Promise<{
  criadas: number;
  atualizadas: number;
  canceladas: number;
  erro?: string;
}> {
  const resumo = { criadas: 0, atualizadas: 0, canceladas: 0 };
  const cred = await accessTokenValido();
  if (!cred) return { ...resumo, erro: "Google não conectado." };
  const { token, calendarId } = cred;
  const cal = encodeURIComponent(calendarId);

  const supabase = await createClient();
  const i = await lerIntegracao();
  let syncToken = i?.sync_token ?? null;

  const eventos: EventoGoogle[] = [];
  let pageToken: string | null = null;
  let novoSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({ singleEvents: "true" });
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      // Primeira sincronização: só de 30 dias atrás em diante.
      const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
      params.set("timeMin", desde);
    }
    if (pageToken) params.set("pageToken", pageToken);

    const resp = await apiGoogle(
      token,
      `/calendars/${cal}/events?${params.toString()}`,
    );

    // 410 = syncToken expirou: zera e refaz do zero.
    if (resp.status === 410) {
      await supabase
        .from("fm_google_integracao")
        .update({ sync_token: null })
        .eq("id", true);
      syncToken = null;
      pageToken = null;
      eventos.length = 0;
      continue;
    }
    if (!resp.ok) return { ...resumo, erro: await resp.text() };

    const data = (await resp.json()) as {
      items?: EventoGoogle[];
      nextPageToken?: string;
      nextSyncToken?: string;
    };
    eventos.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? null;
    if (data.nextSyncToken) novoSyncToken = data.nextSyncToken;
  } while (pageToken);

  for (const ev of eventos) {
    const { data: existente } = await supabase
      .from("fm_reunioes")
      .select("id, status")
      .eq("gcal_event_id", ev.id)
      .maybeSingle();

    if (ev.status === "cancelled") {
      if (existente) {
        await supabase
          .from("fm_reunioes")
          .update({ status: "cancelada" })
          .eq("id", existente.id);
        resumo.canceladas++;
      }
      continue;
    }

    // Horário: evento normal usa dateTime; dia inteiro usa date (00:00).
    const quando = ev.start?.dateTime
      ? ev.start.dateTime.slice(0, 16)
      : ev.start?.date
        ? `${ev.start.date}T00:00`
        : null;
    if (!quando) continue;

    if (existente) {
      await supabase
        .from("fm_reunioes")
        .update({ titulo: ev.summary ?? "(sem título)", data_reuniao: quando })
        .eq("id", existente.id);
      resumo.atualizadas++;
    } else {
      await supabase.from("fm_reunioes").insert({
        titulo: ev.summary ?? "(sem título)",
        data_reuniao: quando,
        status: "agendada",
        gcal_event_id: ev.id,
        ata: "Importada do Google Agenda.",
      });
      resumo.criadas++;
    }
  }

  if (novoSyncToken) {
    await supabase
      .from("fm_google_integracao")
      .update({
        sync_token: novoSyncToken,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", true);
  }

  return resumo;
}

// Salva os tokens vindos do fluxo OAuth (usado pelo callback).
export async function salvarConexao(tokens: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): Promise<void> {
  const supabase = await createClient();
  const email = await emailDaConta(tokens.access_token);
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  // upsert na linha única (id = true)
  await supabase.from("fm_google_integracao").upsert({
    id: true,
    email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: expiry,
    calendar_id: "primary",
    sync_token: null, // força pull completo na primeira sincronização
    conectado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
}

export async function desconectar(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("fm_google_integracao").delete().eq("id", true);
}
