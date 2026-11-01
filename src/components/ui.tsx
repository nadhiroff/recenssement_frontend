import { memo, type ReactNode, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { t } from '@/i18n';
import { vibrerLeger } from '@/lib/retour';
import { useTheme } from '@/theme';
import { couleurStatut, DUREE, espace, rayon, type StatutLien } from '@/theme/tokens';

type Variante = 'corps' | 'titre' | 'sousTitre' | 'petit';
const TAILLES: Record<Variante, number> = { corps: 16, titre: 26, sousTitre: 20, petit: 14 };

export function T({
  v = 'corps',
  couleur,
  gras,
  style,
  ...p
}: TextProps & { v?: Variante; couleur?: string; gras?: boolean }) {
  const { c, echelle } = useTheme();
  const size = TAILLES[v] * echelle;
  return (
    <Text
      {...p}
      style={[
        {
          color: couleur ?? c.text,
          fontSize: size,
          lineHeight: size * 1.35,
          fontWeight: gras || v === 'titre' || v === 'sousTitre' ? '700' : '400',
        },
        style,
      ]}
    />
  );
}

export const Muet = (p: TextProps & { v?: Variante }) => {
  const { c } = useTheme();
  return <T couleur={c.muted} {...p} />;
};

export function Erreur({ children }: { children?: ReactNode }) {
  const { c } = useTheme();
  if (!children) return null;
  return (
    <T v="petit" couleur={c.danger} accessibilityLiveRegion="polite">
      {children}
    </T>
  );
}

export function Bouton({
  titre,
  onPress,
  variante = 'plein',
  chargement,
  desactive,
  testID,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'plein' | 'contour' | 'texte' | 'danger';
  chargement?: boolean;
  desactive?: boolean;
  testID?: string;
}) {
  const { c } = useTheme();
  const inactif = desactive || chargement;
  const fond = variante === 'plein' ? c.primary : variante === 'danger' ? c.danger : 'transparent';
  const texte = variante === 'plein' ? c.surPrimary : variante === 'danger' ? '#FFFFFF' : c.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactif }}
      disabled={inactif}
      onPress={() => {
        vibrerLeger();
        onPress();
      }}
      style={({ pressed }) => [
        styles.bouton,
        {
          backgroundColor: fond,
          borderColor: variante === 'contour' ? c.primary : 'transparent',
          opacity: inactif ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}>
      {chargement ? (
        <ActivityIndicator color={texte} />
      ) : (
        <T gras couleur={texte} style={styles.centre}>
          {titre}
        </T>
      )}
    </Pressable>
  );
}

export function Carte({ style, ...p }: ViewProps) {
  const { c, sombre } = useTheme();
  return (
    <View
      {...p}
      style={[
        styles.carte,
        { backgroundColor: c.surface, borderColor: c.bordure },
        !sombre && styles.ombre,
        style,
      ]}
    />
  );
}

export function Champ({
  label,
  erreur,
  aide,
  ...p
}: TextInputProps & { label: string; erreur?: string; aide?: string }) {
  const { c, echelle } = useTheme();
  return (
    <View style={styles.champ}>
      <T gras v="petit">
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...p}
        style={[
          styles.saisie,
          {
            color: c.text,
            backgroundColor: c.surface,
            borderColor: erreur ? c.danger : c.bordure,
            fontSize: 16 * echelle,
          },
          p.style,
        ]}
      />
      {aide && !erreur ? <Muet v="petit">{aide}</Muet> : null}
      <Erreur>{erreur}</Erreur>
    </View>
  );
}

export function Choix<V extends string>({
  label,
  options,
  valeur,
  onChange,
}: {
  label?: string;
  options: { valeur: V; libelle: string }[];
  valeur: V | null;
  onChange: (v: V) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.champ}>
      {label ? (
        <T gras v="petit">
          {label}
        </T>
      ) : null}
      <View style={styles.choix} accessibilityRole="radiogroup">
        {options.map((o) => {
          const actif = o.valeur === valeur;
          return (
            <Pressable
              key={o.valeur}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              onPress={() => {
                vibrerLeger();
                onChange(o.valeur);
              }}
              style={[
                styles.pastille,
                { borderColor: actif ? c.primary : c.bordure, backgroundColor: actif ? c.primary : c.surface },
              ]}>
              <T v="petit" gras={actif} couleur={actif ? c.surPrimary : c.text}>
                {o.libelle}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Case({ coche, onChange, children }: { coche: boolean; onChange: (v: boolean) => void; children: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: coche }}
      onPress={() => onChange(!coche)}
      style={styles.case}>
      <View style={[styles.boite, { borderColor: coche ? c.primary : c.muted, backgroundColor: coche ? c.primary : 'transparent' }]}>
        {coche ? <T gras couleur={c.surPrimary}>✓</T> : null}
      </View>
      <T style={styles.flex}>{children}</T>
    </Pressable>
  );
}

/** Dot coloré + texte courant : le contraste reste bon quel que soit le statut. */
export const Badge = memo(function Badge({ statut }: { statut: StatutLien }) {
  const { c } = useTheme();
  const couleur = couleurStatut(c, statut);
  return (
    <View style={[styles.badge, { backgroundColor: couleur + '26' }]}>
      <View style={[styles.point, { backgroundColor: couleur }]} />
      <T v="petit" gras>
        {t(`statuts.${statut}`)}
      </T>
    </View>
  );
});

export function Squelette({ hauteur = 72 }: { hauteur?: number }) {
  const { c } = useTheme();
  const reduit = useReducedMotion();
  const opacite = useSharedValue(1);
  useEffect(() => {
    if (!reduit) opacite.value = withRepeat(withTiming(0.45, { duration: 300 * 2 }), -1, true);
  }, [opacite, reduit]);
  const style = useAnimatedStyle(() => ({ opacity: opacite.value }));
  return <Animated.View style={[styles.squelette, { height: hauteur, backgroundColor: c.bordure }, style]} />;
}

export function BarreProgression({ valeur }: { valeur: number }) {
  const { c } = useTheme();
  const reduit = useReducedMotion();
  const largeur = useSharedValue(valeur);
  useEffect(() => {
    largeur.value = reduit ? valeur : withTiming(valeur, { duration: DUREE.normale });
  }, [largeur, reduit, valeur]);
  const style = useAnimatedStyle(() => ({ width: `${largeur.value * 100}%` }));
  return (
    <View style={[styles.barre, { backgroundColor: c.bordure }]} accessibilityRole="progressbar">
      <Animated.View style={[styles.remplissage, { backgroundColor: c.secondary }, style]} />
    </View>
  );
}

/** Petit rebond à l'apparition, pour le choix validé. */
export function useRebond() {
  const echelle = useSharedValue(1);
  const reduit = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  const rebondir = () => {
    if (!reduit) {
      echelle.value = withSequence(withTiming(1.04, { duration: 110 }), withTiming(1, { duration: 130 }));
    }
  };
  return { style, rebondir };
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: 52,
    borderRadius: rayon.m,
    borderWidth: 1.5,
    paddingHorizontal: espace.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: { textAlign: 'center' },
  carte: { borderRadius: rayon.l, borderWidth: StyleSheet.hairlineWidth, padding: espace.m, gap: espace.s },
  ombre: { boxShadow: '0 2px 8px rgba(30,36,32,0.08)' },
  champ: { gap: espace.xs },
  saisie: { minHeight: 52, borderWidth: 1, borderRadius: rayon.m, paddingHorizontal: espace.m },
  choix: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  pastille: { minHeight: 44, paddingHorizontal: espace.m, borderWidth: 1, borderRadius: rayon.m, justifyContent: 'center' },
  case: { flexDirection: 'row', gap: espace.s + 4, alignItems: 'flex-start', minHeight: 44 },
  boite: { width: 28, height: 28, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  point: { width: 8, height: 8, borderRadius: 4 },
  squelette: { borderRadius: rayon.l },
  barre: { height: 6, borderRadius: 3, overflow: 'hidden' },
  remplissage: { height: 6, borderRadius: 3 },
});
