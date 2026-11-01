import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Bouton, Carte, Choix, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import type { Branche, Doublon, FicheDoublon, Lien } from '@/lib/types';
import { vibrerSucces } from '@/lib/retour';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

const STATUTS = ['', 'confirme', 'en_examen', 'declare', 'prive', 'valide', 'rejete'] as const;

function File() {
  const { c } = useTheme();
  const [statut, setStatut] = useState<(typeof STATUTS)[number]>('');
  const [branche, setBranche] = useState('');
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api<Branche[]>('GET', '/branches'), staleTime: 3600_000 });
  const file = useQuery({
    queryKey: ['file', statut, branche],
    queryFn: () => api<Lien[]>('GET', `/referent/file?statut=${statut}&branche=${branche}&per_page=50`),
  });
  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      data={file.data ?? []}
      keyExtractor={(l) => String(l.id)}
      contentContainerStyle={styles.liste}
      refreshing={file.isRefetching}
      onRefresh={file.refetch}
      ListHeaderComponent={
        <View style={styles.liste}>
          <Choix valeur={statut} onChange={setStatut} options={STATUTS.map((s) => ({ valeur: s, libelle: s ? t(`statuts.${s}`) : t('referent.tous') }))} />
          <Choix
            valeur={branche}
            onChange={setBranche}
            options={[{ valeur: '', libelle: t('referent.toutes') }, ...(branches.data ?? []).map((b) => ({ valeur: String(b.id), libelle: b.nom }))]}
          />
          {file.isPending ? <Squelette /> : null}
          <Erreur>{file.error?.message}</Erreur>
        </View>
      }
      ListEmptyComponent={file.isPending ? undefined : <Muet>{t('referent.vide')}</Muet>}
      renderItem={({ item: l }) => (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/lien/${l.id}`)}>
          <Carte>
            <T>{t('liens.entre', { parent: l.parent?.nom_complet ?? '', role: t(`roles.${l.role_parent}`), enfant: l.enfant?.nom_complet ?? '' })}</T>
            <Badge statut={l.statut} />
            {l.conflit ? <T v="petit" gras couleur={c.secondary}>{t('referent.autreReferent')}</T> : null}
          </Carte>
        </Pressable>
      )}
    />
  );
}

function ColonneDoublon({ p }: { p: FicheDoublon }) {
  return (
    <View style={styles.colonne}>
      <T gras>{p.nom_complet}</T>
      {p.noms.filter((n) => !['nom_famille', 'naissance'].includes(n.type)).map((n) => (
        <Muet key={n.valeur} v="petit">{n.valeur}</Muet>
      ))}
      <Muet v="petit">{t('referent.naissance', { annee: p.annee_naissance ?? t('referent.aucun') })}</Muet>
      <Muet v="petit">{t('referent.pere', { nom: p.pere ?? t('referent.aucun') })}</Muet>
      <Muet v="petit">{t('referent.mere', { nom: p.mere ?? t('referent.aucun') })}</Muet>
    </View>
  );
}

function CarteDoublon({ d }: { d: Doublon }) {
  const client = useQueryClient();
  const apres = () => {
    vibrerSucces();
    client.invalidateQueries({ queryKey: ['doublons'] });
  };
  const fusion = useMutation({
    mutationFn: (id: number) => api('POST', `/doublons/${d.id}/fusionner`, { personne_conservee_id: id }),
    onSuccess: apres,
  });
  const distinct = useMutation({ mutationFn: () => api('POST', `/doublons/${d.id}/distinct`, {}), onSuccess: apres });
  const [choix, setChoix] = useState<number | null>(null);
  return (
    <Carte>
      <Muet v="petit">{t('referent.score', { n: d.score })}</Muet>
      <View style={styles.colonnes}>
        <ColonneDoublon p={d.a} />
        <ColonneDoublon p={d.b} />
      </View>
      <Choix
        label={t('referent.fusionner')}
        valeur={choix === null ? null : String(choix)}
        onChange={(v) => setChoix(Number(v))}
        options={[d.a, d.b].map((p) => ({ valeur: String(p.id), libelle: t('referent.numero', { id: p.id }) }))}
      />
      {choix !== null ? (
        <Bouton titre={t('referent.confirmerFusion', { id: choix })} chargement={fusion.isPending} onPress={() => fusion.mutate(choix)} />
      ) : null}
      <Bouton variante="contour" titre={t('referent.distincts')} chargement={distinct.isPending} onPress={() => distinct.mutate()} />
      <Erreur>{fusion.error?.message ?? distinct.error?.message}</Erreur>
    </Carte>
  );
}

function Doublons() {
  const liste = useQuery({ queryKey: ['doublons'], queryFn: () => api<Doublon[]>('GET', '/doublons?per_page=30') });
  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      data={liste.data ?? []}
      keyExtractor={(d) => String(d.id)}
      contentContainerStyle={styles.liste}
      refreshing={liste.isRefetching}
      onRefresh={liste.refetch}
      ListHeaderComponent={liste.isPending ? <Squelette hauteur={160} /> : <Erreur>{liste.error?.message}</Erreur>}
      ListEmptyComponent={liste.isPending ? undefined : <Muet>{t('referent.vide')}</Muet>}
      renderItem={({ item }) => <CarteDoublon d={item} />}
    />
  );
}

export default function Referent() {
  const { c } = useTheme();
  const haut = useSafeAreaInsets().top;
  const [vue, setVue] = useState<'file' | 'doublons'>('file');
  return (
    <View style={[styles.racine, { backgroundColor: c.background, paddingTop: haut + espace.m }]}>
      <View style={styles.entete}>
        <T v="titre">{t('referent.titre')}</T>
        <Choix valeur={vue} onChange={setVue} options={[{ valeur: 'file', libelle: t('referent.file') }, { valeur: 'doublons', libelle: t('referent.doublons') }]} />
      </View>
      {vue === 'file' ? <File /> : <Doublons />}
    </View>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1 },
  entete: { paddingHorizontal: espace.m, gap: espace.s, width: '100%', maxWidth: 720, alignSelf: 'center' },
  liste: { padding: espace.m, gap: espace.m, width: '100%', maxWidth: 720, alignSelf: 'center' },
  colonnes: { flexDirection: 'row', gap: espace.m },
  colonne: { flex: 1, gap: 2 },
});
