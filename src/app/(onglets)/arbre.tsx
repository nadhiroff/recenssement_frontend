import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Carte, Champ, Choix, Erreur, Muet, Squelette, T } from '@/components/ui';
import { Noeud } from '@/features/arbre/Noeud';
import { ZoomPan } from '@/features/arbre/ZoomPan';
import { decrire } from '@/features/inscription/CarteCandidat';
import { t } from '@/i18n';
import { api, ErreurApi } from '@/lib/api';
import type { Personne } from '@/lib/auth';
import type { Branche, NoeudArbre } from '@/lib/types';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

export default function Arbre() {
  const { c } = useTheme();
  const haut = useSafeAreaInsets().top;
  const [branche, setBranche] = useState('');
  const [racine, setRacine] = useState<number | null>(null);
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    const m = setTimeout(() => setRecherche(saisie.trim()), 400);
    return () => clearTimeout(m);
  }, [saisie]);

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api<Branche[]>('GET', '/branches'), staleTime: 3600_000 });
  const arbre = useQuery({
    queryKey: ['arbre', branche, racine],
    queryFn: () => api<NoeudArbre>('GET', `/arbre?profondeur=2&branche=${branche}&racine=${racine ?? ''}`),
    retry: false,
  });
  const trouves = useQuery({
    queryKey: ['recherche', recherche],
    queryFn: () => api<Personne[]>('GET', `/personnes/recherche?per_page=10&q=${encodeURIComponent(recherche)}`),
    enabled: recherche.length >= 2,
  });

  const ferme = arbre.error instanceof ErreurApi && arbre.error.code === 'arbre_ferme';
  const vide = arbre.error instanceof ErreurApi && arbre.error.code === 'arbre_vide';

  return (
    <View style={[styles.racine, { backgroundColor: c.background, paddingTop: haut + espace.m }]}>
      <View style={styles.entete}>
        <T v="titre">{t('arbre.titre')}</T>
        <Champ label={t('arbre.rechercher')} value={saisie} onChangeText={setSaisie} autoCorrect={false} />
        {saisie.trim() !== '' && recherche.length >= 2 ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.resultats} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pile}>
            {trouves.isPending ? <Squelette hauteur={48} /> : null}
            {trouves.data?.length === 0 ? <Muet>{t('commun.aucunResultat')}</Muet> : null}
            {trouves.data?.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => {
                  setRacine(p.id);
                  setSaisie('');
                }}>
                <Carte>
                  <T gras>{p.nom_complet}</T>
                  {decrire(p) ? <Muet v="petit">{decrire(p)}</Muet> : null}
                </Carte>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Choix
            label={t('arbre.branche')}
            valeur={branche}
            onChange={(v) => {
              setBranche(v);
              setRacine(null);
            }}
            options={[{ valeur: '', libelle: t('arbre.toutes') }, ...(branches.data ?? []).map((b) => ({ valeur: String(b.id), libelle: b.nom }))]}
          />
        )}
      </View>
      {arbre.isPending ? (
        <View style={styles.pile}>
          <Squelette />
          <Squelette />
        </View>
      ) : null}
      {ferme || vide ? <Muet style={styles.message}>{t(ferme ? 'arbre.ferme' : 'arbre.vide')}</Muet> : null}
      {!ferme && !vide ? <Erreur>{arbre.error?.message}</Erreur> : null}
      {arbre.data ? (
        <ZoomPan>
          <Noeud key={arbre.data.personne.id} noeud={arbre.data} />
        </ZoomPan>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1 },
  entete: { paddingHorizontal: espace.m, gap: espace.s },
  pile: { padding: espace.m, gap: espace.s },
  resultats: { maxHeight: 240 },
  message: { padding: espace.m },
});
