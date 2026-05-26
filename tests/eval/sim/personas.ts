import type { FixtureName } from "../fixtures";

// "Arquitectos robot": perfiles que generan mensajes como los reenviaría una
// persona real. Cada uno escribe distinto → exponen distintas debilidades.

export type Persona = {
  id: string;
  label: string;
  description: string;
  fixture: FixtureName;
};

export const PERSONAS: Record<string, Persona> = {
  "apurado": {
    id: "apurado",
    label: "Arquitecto apurado en obra",
    description:
      "Arquitecto rioplatense con 3 obras activas. Anda con el celular en la mano en la obra, escribe corto y con errores de tipeo, reenvía ráfagas de fotos casi sin caption, a veces aclara de qué obra es y a veces no. De vez en cuando reenvía algo personal por error (un meme, un audio de la familia). Mezcla obras en un mismo mensaje.",
    fixture: "tres-obras",
  },
  "ordenada": {
    id: "ordenada",
    label: "Arquitecta ordenada",
    description:
      "Arquitecta prolija. Casi siempre aclara la obra, manda cotizaciones con montos claros y proveedor nombrado, registra pagos y aprobaciones, pide informes para el cliente. Usa comandos como 'obra Belgrano'. Pocas ambigüedades.",
    fixture: "tres-obras",
  },
};
