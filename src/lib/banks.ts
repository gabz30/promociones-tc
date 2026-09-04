import type { BankId } from "./types";

export interface BankTheme {
  id: BankId;
  name: string;
  color: string;
  soft: string;
  onColor: string;
  slogan: string;
}

export const BANK_THEMES: Record<BankId, BankTheme> = {
  qik: {
    id: "qik",
    name: "Qik",
    color: "#0082CD",
    soft: "#e5f4fb",
    onColor: "#ffffff",
    slogan: "Azul que va contigo",
  },
  lafise: {
    id: "lafise",
    name: "LAFISE",
    color: "#00583C",
    soft: "#e4efea",
    onColor: "#ffffff",
    slogan: "Tu mundo. Tu banco",
  },
  bhd: {
    id: "bhd",
    name: "BHD",
    color: "#50BA3F",
    soft: "#eaf7e7",
    onColor: "#ffffff",
    slogan: "El banco como tú",
  },
  scotia: {
    id: "scotia",
    name: "Scotiabank",
    color: "#EC111A",
    soft: "#fde8e9",
    onColor: "#ffffff",
    slogan: "You're richer than you think",
  },
  cibao: {
    id: "cibao",
    name: "Cibao",
    color: "#0B3D91",
    soft: "#e8eef8",
    onColor: "#ffffff",
    slogan: "Juntos lo hacemos realidad",
  },
  bsc: {
    id: "bsc",
    name: "Santa Cruz",
    color: "#12499B",
    soft: "#e7eef8",
    onColor: "#ffffff",
    slogan: "Más cerca de ti",
  },
};

export function getBankTheme(bankId: BankId): BankTheme {
  return BANK_THEMES[bankId];
}
