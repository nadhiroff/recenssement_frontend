import type { StatutLien } from '@/theme/tokens';

import type { Personne } from './auth';

export type Lien = {
  id: number;
  role_parent: 'pere' | 'mere';
  statut: StatutLien;
  declare_le: string;
  parent: Personne | null;
  enfant: Personne | null;
  motif_rejet?: string | null;
  motif_prive?: string | null;
  branche_id?: number | null;
  conflit?: boolean;
  declarant?: string | null;
  invitations?: { created_at: string; utilise_le: string | null; reponse: 'confirme' | 'refuse' | null }[];
  historique?: { action: string; cree_le: string }[];
};

export type Branche = { id: number; nom: string; description: string | null };

export type Notification = {
  id: number;
  type: string;
  message: string;
  lien_id: number | null;
  lu_le: string | null;
  created_at: string;
};

export type FicheDoublon = Personne & { pere: string | null; mere: string | null };
export type Doublon = { id: number; score: number; a: FicheDoublon; b: FicheDoublon };

export type NoeudArbre = {
  personne: Personne;
  statut_lien: StatutLien | null;
  a_suite?: boolean;
  foyers?: Foyer[];
};

export type Foyer = {
  conjoint: Personne | null;
  rang: number | null;
  statut_union: StatutLien | null;
  enfants: NoeudArbre[];
};

export type StatBranche = {
  branche_id: number;
  nom: string;
  personnes: number;
  doublons: number;
  liens: Record<StatutLien, number>;
};

export type ProcheFamille = {
  personne: Personne;
  role: 'pere' | 'mere' | null;
  rang: number | null;
  statut: StatutLien | null;
};

export type FamillePersonne = { parents: ProcheFamille[]; conjoints: ProcheFamille[]; enfants: ProcheFamille[] };
