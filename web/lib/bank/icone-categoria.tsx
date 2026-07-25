import type { ComponentType } from "react";
import {
  IconShoppingCart,
  IconPill,
  IconGasStation,
  IconToolsKitchen2,
  IconPackage,
  IconBeach,
  IconRepeat,
  IconReceipt,
  IconSchool,
  IconHeartbeat,
  IconCar,
  IconHome,
  IconCoins,
  IconCreditCard,
  IconChartLine,
  IconWallet,
  IconDots,
} from "@/components/bank/ui/icones";

type IconeProps = { size?: number; stroke?: number; className?: string };

// Mapa Tag (categoria) → ícone. Chaves batem com os nomes reais das
// categorias semeadas (05_lancamento_rapido.sql + 10_norte.sql), que por
// sua vez espelham as Tags do Notion.
const MAPA: Record<string, ComponentType<IconeProps>> = {
  Mercado: IconShoppingCart,
  Farmácia: IconPill,
  Combustível: IconGasStation,
  "Jantar/Food": IconToolsKitchen2,
  "E-Commerce/Compras": IconPackage,
  Lazer: IconBeach,
  Assinaturas: IconRepeat,
  Contas: IconReceipt,
  Educação: IconSchool,
  Saúde: IconHeartbeat,
  Transporte: IconCar,
  Utilitários: IconHome,
  Dívidas: IconCoins,
  Fatura: IconCreditCard,
  Investimentos: IconChartLine,
  Semanal: IconWallet,
};

export function IconeCategoria({
  categoria,
  size = 16,
  stroke = 1.8,
  className,
}: {
  categoria: string | null;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const Icone = (categoria && MAPA[categoria]) || IconDots;
  return <Icone size={size} stroke={stroke} className={className} />;
}
