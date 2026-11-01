import { useQuery } from '@tanstack/react-query';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import type { Foyer, NoeudArbre } from '@/lib/types';
import { useTheme } from '@/theme';
import { couleurStatut, DUREE, espace, rayon } from '@/theme/tokens';

const titreFoyer = (f: Foyer) => {
  if (!f.conjoint) return t('arbre.sansMere');
  const nom = t('arbre.avec', { nom: f.conjoint.nom_complet });
  if (!f.rang) return nom;
  return `${nom} (${f.rang === 1 ? t('arbre.premiere') : t('arbre.rang', { n: f.rang })})`;
};

function Sous({ racine }: { racine: number }) {
  const suite = useQuery({
    queryKey: ['arbre', 'noeud', racine],
    queryFn: () => api<NoeudArbre>('GET', `/arbre?racine=${racine}&profondeur=1`),
  });
  if (suite.isPending) return <Squelette hauteur={48} />;
  if (suite.error) return <Erreur>{suite.error.message}</Erreur>;
  return <Foyers foyers={suite.data.foyers ?? []} />;
}

function Foyers({ foyers }: { foyers: Foyer[] }) {
  const { c } = useTheme();
  return (
    <View style={[styles.descendance, { borderLeftColor: c.bordure }]}>
      {foyers.map((f, i) => (
        <View key={f.conjoint?.id ?? `sans-${i}`} style={styles.foyer}>
          <Muet v="petit">{titreFoyer(f)}</Muet>
          {f.enfants.map((e) => (
            <Noeud key={e.personne.id} noeud={e} />
          ))}
        </View>
      ))}
    </View>
  );
}

export const Noeud = memo(function Noeud({ noeud }: { noeud: NoeudArbre }) {
  const { c } = useTheme();
  const { personne: p, statut_lien: statut } = noeud;
  const prechargé = !!noeud.foyers?.length;
  const [ouvert, setOuvert] = useState(prechargé);
  const extensible = prechargé || !!noeud.a_suite;
  const provisoire = !!statut && statut !== 'valide';
  const annees = p.annee_naissance ? `${p.precision_naissance === 'exacte' ? '' : '~'}${p.annee_naissance}` : '';
  return (
    <Animated.View entering={FadeInDown.duration(DUREE.normale).reduceMotion(ReduceMotion.System)} style={styles.noeud}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityHint={extensible ? t('arbre.voirSuite') : undefined}
        disabled={!extensible}
        onPress={() => setOuvert((v) => !v)}
        style={[
          styles.fiche,
          {
            backgroundColor: c.surface,
            borderColor: provisoire ? couleurStatut(c, statut) : p.est_fondateur ? c.accent : c.bordure,
            borderStyle: provisoire && statut !== 'prive' ? 'dashed' : 'solid',
            borderWidth: provisoire || p.est_fondateur ? 2 : 1,
          },
        ]}>
        <View style={styles.texte}>
          <T gras>{`${p.nom_complet}${p.est_decede ? ` ${t('arbre.decede')}` : ''}`}</T>
          {annees || provisoire ? (
            <Muet v="petit">{[annees, provisoire ? t(`statuts.${statut}`) : ''].filter(Boolean).join(' · ')}</Muet>
          ) : null}
          {p.est_fondateur ? <T v="petit" gras>{t('arbre.fondateur')}</T> : null}
        </View>
        {extensible ? <T gras couleur={c.primary}>{ouvert ? '−' : '+'}</T> : null}
      </Pressable>
      {ouvert ? prechargé ? <Foyers foyers={noeud.foyers ?? []} /> : <Sous racine={p.id} /> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  noeud: { gap: espace.xs },
  fiche: { flexDirection: 'row', alignItems: 'center', minHeight: 56, minWidth: 240, paddingHorizontal: espace.m, paddingVertical: espace.s, borderRadius: rayon.m, gap: espace.s },
  texte: { flex: 1 },
  descendance: { marginLeft: espace.m, paddingLeft: espace.m, borderLeftWidth: 2, gap: espace.s },
  foyer: { gap: espace.xs },
});
