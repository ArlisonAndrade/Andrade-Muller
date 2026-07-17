"use server";

import { revalidatePath } from "next/cache";
import { desconectar, puxarDoGoogle } from "@/lib/google/calendar";

// Puxa mudanças do Google Agenda para o sistema (botão "Sincronizar").
export async function sincronizarComGoogle() {
  const r = await puxarDoGoogle();
  revalidatePath("/reunioes");
  return r;
}

// Remove a conexão (apaga os tokens guardados).
export async function desconectarGoogle() {
  await desconectar();
  revalidatePath("/reunioes");
}
