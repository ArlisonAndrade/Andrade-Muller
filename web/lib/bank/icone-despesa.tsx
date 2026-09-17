"use client";

import { useState, type ComponentType } from "react";
import {
  IconBulb,
  IconDroplet,
  IconBuildingEstate,
  IconBuilding,
  IconWifi,
  IconDeviceMobile,
  IconDeviceTv,
  IconSchool,
  IconLanguage,
  IconSwimming,
  IconBarbell,
  IconBallTennis,
  IconBucketDroplet,
  IconCar,
  IconPool,
  IconPigMoney,
  IconCoins,
  IconShoppingCart,
  IconBook,
} from "@/components/bank/ui/icones";
import { IconeCategoria } from "@/lib/bank/icone-categoria";

type IconeProps = { size?: number; stroke?: number; className?: string };

// Ícone da DESPESA (pedido do Arlison, 17/set/2026): primeiro pelo nome do
// item — "Luz" é uma lâmpada mesmo estando na categoria Contas —, depois pela
// categoria. Empresa com site cadastrado (`logo_dominio`) mostra a logo real.
const POR_NOME: Array<[RegExp, ComponentType<IconeProps>]> = [
  [/\b(luz|energia|enel|cemig|copel|light)\b/i, IconBulb],
  [/\b(água|agua|sabesp|saneamento)\b/i, IconDroplet],
  [/\b(aluguel|financiamento imob)/i, IconBuildingEstate],
  [/\bcondom[ií]nio\b/i, IconBuilding],
  [/\b(internet|fibra|wi-?fi)\b/i, IconWifi],
  [/\b(celular|telefone|tim|vivo|oi)\b/i, IconDeviceMobile],
  [/\b(tv|streaming)\b/i, IconDeviceTv],
  [/\b(ingl[eê]s|idioma|curso)\b/i, IconLanguage],
  [/\b(escola|col[eé]gio|faculdade|mensalidade escolar)\b/i, IconSchool],
  [/\b(leitura|livro|leiturinha)\b/i, IconBook],
  [/\b(nata[cç][aã]o|piscina)\b/i, IconSwimming],
  [/\b(academia|personal|muscula[cç][aã]o|crossfit)\b/i, IconBarbell],
  [/\b(t[eê]nis|tennis|beach)\b/i, IconBallTennis],
  [/\b(diarista|faxina|limpeza)\b/i, IconBucketDroplet],
  [/\b(carro|ve[ií]culo|uber|combust[ií]vel)\b/i, IconCar],
  [/\bclube\b/i, IconPool],
  [/\b(aporte|investimento|reserva)\b/i, IconPigMoney],
  [/\b(parcela|d[ií]vida|empr[eé]stimo|consignado)\b/i, IconCoins],
  [/\b(mercado|semana|vari[aá]veis)\b/i, IconShoppingCart],
];

export function IconeDespesa({
  item,
  categoria,
  logoDominio,
  size = 16,
  stroke = 1.8,
  tamanhoLogo = 32,
}: {
  item: string;
  categoria: string | null;
  logoDominio?: string | null;
  size?: number;
  stroke?: number;
  tamanhoLogo?: number;
}) {
  const [logoFalhou, setLogoFalhou] = useState(false);

  if (logoDominio && !logoFalhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ícone externo pequeno, sem otimização
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoDominio)}&sz=128`}
        alt=""
        width={tamanhoLogo}
        height={tamanhoLogo}
        loading="lazy"
        onError={() => setLogoFalhou(true)}
        className="rounded-full bg-white object-contain"
        style={{ width: tamanhoLogo, height: tamanhoLogo }}
      />
    );
  }

  const Icone = POR_NOME.find(([re]) => re.test(item))?.[1];
  if (Icone) return <Icone size={size} stroke={stroke} />;
  return <IconeCategoria categoria={categoria} size={size} stroke={stroke} />;
}
