import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Carte, Muet, Squelette, T } from '@/components/ui';
import fr from '@/i18n/fr.json';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import type { Personne } from '@/lib/auth';
import type { Branche, FamillePersonne, ProcheFamille } from '@/lib/types';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

export function formaterNaissance(p: Personne): string {
  if (!p.annee_naissance) return t('personne.inconnue');
  if (p.jour_naissance && p.mois_naissance) {
    return `${p.jour_naissance} ${fr.personne.mois[p.mois_naissance - 1]} ${p.annee_naissance}`;
  }
  if (p.mois_naissance) return `${fr.personne.mois[p.mois_naissance - 1]} ${p.annee_naissance}`;
  if (p.precision_naissance === 'environ') return t('personne.vers', { annee: p.annee_naissance });
  if (p.precision_naissance === 'decennie') return t('personne.annees', { annee: p.annee_naissance - (p.annee_naissance % 10) });
  return String(p.annee_naissance);
}

export function Initiales({ nom }: { nom: string }) {
  const { c } = useTheme();
  const lettres = nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();
  return (
    <View style={[styles.initiales, { backgroundColor: c.primary }]} importantForAccessibility="no">
      <T v="sousTitre" couleur={c.surPrimary}>{lettres}</T>
    </View>
  );
}

export function Ligne({ libelle, valeur }: { libelle: string; valeur?: string | null }) {
  if (!valeur) return null;
  return (
    <View style={styles.ligne}>
      <Muet v="petit">{libelle}</Muet>
      <T>{valeur}</T>
    </View>
  );
}

export function EnteteFiche({ p }: { p: Personne }) {
  return (
    <View style={styles.entete}>
      <Initiales nom={p.nom_complet} />
      <View style={styles.flex}>
        <T v="titre">{p.nom_complet}</T>
        {p.est_fondateur ? <T v="petit" gras>{t('arbre.fondateur')}</T> : null}
      </View>
    </View>
  );
}

export function InfosFiche({ p }: { p: Personne }) {
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api<Branche[]>('GET', '/branches'), staleTime: 3600_000 });
  const autres = p.noms.filter((n) => n.type !== 'nom_famille' && !(n.type === 'naissance' && n.principal !== false && p.nom_complet.startsWith(n.valeur)));
  return (
    <Carte>
      <Ligne libelle={t('personne.naissance')} valeur={formaterNaissance(p)} />
      {p.est_decede ? <Ligne libelle={t('personne.deces')} valeur={p.annee_deces ? String(p.annee_deces) : t('personne.decede')} /> : null}
      {p.sexe !== 'I' ? <Ligne libelle={t('personne.sexe')} valeur={t(`inscription.sexes.${p.sexe}`)} /> : null}
      {autres.map((n) => (
        <Ligne key={`${n.type}-${n.valeur}`} libelle={t(`personne.types.${n.type}`)} valeur={n.valeur} />
      ))}
      <Ligne libelle={t('personne.branche')} valeur={branches.data?.find((b) => b.id === p.branche_id)?.nom} />
      <Ligne libelle={t('personne.residence')} valeur={p.lieu_residence} />
      <Ligne libelle={t('personne.telephone')} valeur={p.telephone_whatsapp} />
      <Ligne libelle={t('personne.email')} valeur={p.email} />
    </Carte>
  );
}

function Proches({ titre, liste }: { titre: string; liste: ProcheFamille[] }) {
  const { c } = useTheme();
  if (liste.length === 0) return null;
  return (
    <View style={styles.pile}>
      <Muet v="petit">{titre}</Muet>
      {liste.map((m) => (
        <Pressable
          key={m.personne.id}
          testID={`proche-${m.personne.id}`}
          accessibilityRole="button"
          onPress={() => router.push(`/personne/${m.personne.id}`)}
          style={[styles.proche, { borderColor: c.bordure }]}>
          <T style={styles.flex}>{m.personne.nom_complet}</T>
          {m.statut && m.statut !== 'valide' ? <Badge statut={m.statut} /> : null}
          <T couleur={c.primary}>›</T>
        </Pressable>
      ))}
    </View>
  );
}

export function FamilleFiche({ id }: { id: number }) {
  const famille = useQuery({ queryKey: ['famille', id], queryFn: () => api<FamillePersonne>('GET', `/personnes/${id}/famille`) });
  if (famille.isPending) return <Squelette hauteur={96} />;
  const f = famille.data;
  const vide = !f || f.parents.length + f.conjoints.length + f.enfants.length === 0;
  return (
    <Carte>
      <T v="sousTitre">{t('personne.famille')}</T>
      {vide ? <Muet>{t('personne.aucun')}</Muet> : null}
      {f ? (
        <>
          <Proches titre={t('personne.parents')} liste={f.parents} />
          <Proches titre={t('personne.conjoints')} liste={f.conjoints} />
          <Proches titre={t('personne.enfants')} liste={f.enfants} />
        </>
      ) : null}
    </Carte>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  initiales: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  ligne: { gap: 2, paddingVertical: 2 },
  pile: { gap: espace.xs },
  proche: { flexDirection: 'row', alignItems: 'center', gap: espace.s, minHeight: 48, paddingHorizontal: espace.s, borderBottomWidth: StyleSheet.hairlineWidth },
});
