import type { BankId } from "./types";

export interface BankTheme {
  id: BankId;
  name: string;
  color: string;
  soft: string;
  onColor: string;
  slogan: string;
  logo: string;
}

export const BANK_THEMES: Record<BankId, BankTheme> = {
  qik: {
    id: "qik",
    name: "Qik",
    color: "#0082CD",
    soft: "#e5f4fb",
    onColor: "#ffffff",
    slogan: "Azul que va contigo",
    logo: "/banks/qik.svg",
  },
  lafise: {
    id: "lafise",
    name: "LAFISE",
    color: "#00583C",
    soft: "#e4efea",
    onColor: "#ffffff",
    slogan: "Tu mundo. Tu banco",
    logo: "https://cdn.lafise.com/web-resources/common-assets/menu/logo-banco-LAFISE.svg",
  },
  bhd: {
    id: "bhd",
    name: "BHD",
    color: "#50BA3F",
    soft: "#eaf7e7",
    onColor: "#ffffff",
    slogan: "El banco como tú",
    logo: "https://static.bhd.com.do/Logo_BHD_720x720_2572a8f63b.png",
  },
  scotia: {
    id: "scotia",
    name: "Scotiabank",
    color: "#EC111A",
    soft: "#fde8e9",
    onColor: "#ffffff",
    slogan: "You're richer than you think",
    logo: "https://do.scotiabank.com/content/dam/scotiabank/images/logos/2019/scotiabank-logo-red-desktop-200px.svg",
  },
  cibao: {
    id: "cibao",
    name: "Cibao",
    color: "#0B3D91",
    soft: "#e8eef8",
    onColor: "#ffffff",
    slogan: "Juntos lo hacemos realidad",
    logo: "https://www.cibao.com.do/media/c2mepk1b/logo-transicion-9-1.png",
  },
  bsc: {
    id: "bsc",
    name: "Santa Cruz",
    color: "#12499B",
    soft: "#e7eef8",
    onColor: "#ffffff",
    slogan: "Más cerca de ti",
    logo: "/banks/bsc.svg",
  },
};

export function getBankTheme(bankId: BankId): BankTheme {
  return BANK_THEMES[bankId];
}
