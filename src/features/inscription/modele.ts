import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

export const PRECISIONS = ['exacte', 'environ', 'decennie', 'inconnue'] as const;
export const TYPES_NOMS = ['vodoun', 'bapteme', 'surnom'] as const;
export const TYPES_TIERS = ['enfant_mineur', 'parent_decede', 'aine', 'autre'] as const;

const anneeOuVide = z.string().refine((v) => {
  if (v === '') return true;
  const n = Number(v);
  return /^\d{4}$/.test(v) && n >= 1700 && n <= new Date().getFullYear();
}, 'erreurs.annee');

export const parentSchema = z.object({
  mode: z.enum(['a_choisir', 'existante', 'nouvelle', 'inconnu']),
  personne_id: z.number().nullable(),
  apercu: z.string(),
  nom_famille: z.string(),
  prenoms: z.string(),
  annee_naissance: anneeOuVide,
  precision_naissance: z.enum(PRECISIONS),
  est_decede: z.boolean(),
  parent_nom: z.string(),
  rapprochement_vu: z.boolean(),
});

export type ParentBrouillon = z.infer<typeof parentSchema>;

export const brouillonSchema = z.object({
  client_uuid: z.string(),
  etape: z.number(),
  type: z.enum(TYPES_TIERS).nullable(),
  present_lors_saisie: z.boolean(),
  identite: z.object({
    nom_famille: z.string().trim().min(1, 'erreurs.requis'),
    prenoms: z.string().trim().min(1, 'erreurs.requis'),
    autres_noms: z.array(z.object({ type: z.enum(TYPES_NOMS), valeur: z.string() })),
    sexe: z.enum(['M', 'F', 'I']),
    annee_naissance: anneeOuVide,
    precision_naissance: z.enum(PRECISIONS),
    lieu_residence: z.string(),
    rapprochement_vu: z.boolean(),
  }),
  personne_existante_id: z.number().nullable(),
  branche_id: z.number().nullable(),
  pere: parentSchema,
  mere: parentSchema,
  consentement: z.boolean(),
});

export type Brouillon = z.infer<typeof brouillonSchema>;
export type Parcours = 'soi' | 'tiers';

export function nouvelUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

export const parentVide = (): ParentBrouillon => ({
  mode: 'a_choisir',
  personne_id: null,
  apercu: '',
  nom_famille: '',
  prenoms: '',
  annee_naissance: '',
  precision_naissance: 'environ',
  est_decede: false,
  parent_nom: '',
  rapprochement_vu: false,
});

export const brouillonVide = (): Brouillon => ({
  client_uuid: nouvelUuid(),
  etape: 0,
  type: null,
  present_lors_saisie: false,
  identite: {
    nom_famille: 'ZOCLI',
    prenoms: '',
    autres_noms: [],
    sexe: 'I',
    annee_naissance: '',
    precision_naissance: 'environ',
    lieu_residence: '',
    rapprochement_vu: false,
  },
  personne_existante_id: null,
  branche_id: null,
  pere: parentVide(),
  mere: parentVide(),
  consentement: false,
});

const cleBrouillon = (p: Parcours) => `brouillon.${p}`;

export async function lireBrouillon(p: Parcours): Promise<Brouillon | null> {
  const brut = await AsyncStorage.getItem(cleBrouillon(p));
  if (!brut) return null;
  const lu = brouillonSchema.safeParse(JSON.parse(brut));
  return lu.success ? lu.data : null;
}

export const ecrireBrouillon = (p: Parcours, b: Brouillon) =>
  AsyncStorage.setItem(cleBrouillon(p), JSON.stringify(b));

export const effacerBrouillon = (p: Parcours) => AsyncStorage.removeItem(cleBrouillon(p));

function parentCharge(p: ParentBrouillon) {
  if (p.mode === 'existante' && p.personne_id) return { personne_id: p.personne_id };
  if (p.mode !== 'nouvelle') return undefined;
  return {
    nouvelle: {
      nom_famille: p.nom_famille.trim(),
      prenoms: p.prenoms.trim(),
      annee_naissance: p.annee_naissance === '' ? null : Number(p.annee_naissance),
      precision_naissance: p.annee_naissance === '' ? 'inconnue' : p.precision_naissance,
      est_decede: p.est_decede,
      pere_nom: p.parent_nom.trim() || undefined,
      rapprochement_vu: p.rapprochement_vu,
    },
  };
}

/** Corps de POST /inscriptions ou /inscriptions/tiers. */
export function construireCorps(b: Brouillon, parcours: Parcours): Record<string, unknown> {
  const annee = b.identite.annee_naissance;
  const corps: Record<string, unknown> = {
    client_uuid: b.client_uuid,
    branche_id: b.branche_id,
    consentement: b.consentement,
    pere: parentCharge(b.pere),
    mere: parentCharge(b.mere),
    identite: {
      ...b.identite,
      nom_famille: b.identite.nom_famille.trim(),
      prenoms: b.identite.prenoms.trim(),
      autres_noms: b.identite.autres_noms.filter((n) => n.valeur.trim() !== ''),
      annee_naissance: annee === '' ? null : Number(annee),
      precision_naissance: annee === '' ? 'inconnue' : b.identite.precision_naissance,
    },
  };
  if (parcours === 'tiers') {
    corps.type = b.type;
    corps.present_lors_saisie = b.present_lors_saisie;
    if (b.personne_existante_id) corps.personne_id = b.personne_existante_id;
  }
  return corps;
}
