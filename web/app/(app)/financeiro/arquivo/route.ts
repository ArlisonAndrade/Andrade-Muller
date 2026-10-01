import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Abre um arquivo do bucket privado `fiscal` (PDF da nota, OFX do extrato):
// gera um link assinado de 60 s e redireciona. Passa pelo proxy (exige login)
// e pela policy do bucket (só membros da consultoria).
export async function GET(request: Request) {
  const caminho = new URL(request.url).searchParams.get("caminho");
  if (!caminho || !/^(notas|extratos)\//.test(caminho) || caminho.includes("..")) {
    return NextResponse.json({ erro: "caminho inválido" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("fiscal").createSignedUrl(caminho, 60);
  if (error || !data) return NextResponse.json({ erro: "arquivo não encontrado" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
