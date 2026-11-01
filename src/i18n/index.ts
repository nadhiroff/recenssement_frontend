import fr from './fr.json';

// Ajouter fon.json et mina.json avec les mêmes clés, puis les déclarer ici.
const langues = { fr } as const;
export type Langue = keyof typeof langues;

let courante: Langue = 'fr';

function chercher(objet: unknown, chemin: string): string | undefined {
  const valeur = chemin.split('.').reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    objet
  );
  return typeof valeur === 'string' ? valeur : undefined;
}

export function t(cle: string, params?: Record<string, string | number>): string {
  const texte = chercher(langues[courante], cle) ?? chercher(langues.fr, cle) ?? cle;
  if (!params) return texte;
  return texte.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));
}

export function changerLangue(langue: Langue) {
  courante = langue;
}

/** Consigne audio d'une clé pour les aînés : assets/audio/<cle>.mp3 (points remplacés par _). */
export const cleAudio = (cle: string) => `audio/${cle.replace(/\./g, '_')}.mp3`;
