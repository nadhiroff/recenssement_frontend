import { type ComponentRef, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { espace } from '@/theme/tokens';

import { ClavierContexte, type Clavier, type RefChamp } from './clavier';

const MARGE_AU_DESSUS_DU_CHAMP = 88;

export function Ecran({ children, pied, sansDefilement }: { children: ReactNode; pied?: ReactNode; sansDefilement?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const racine = useRef<ComponentRef<typeof View>>(null);
  const defilement = useRef<ComponentRef<typeof ScrollView>>(null);
  const contenu = useRef<ComponentRef<typeof View>>(null);
  const champs = useRef(new Set<RefChamp>());
  const actif = useRef<RefChamp | null>(null);
  const [recouvrement, setRecouvrement] = useState(0);

  const position = useCallback(
    (r: RefChamp) =>
      new Promise<number>((resoudre) => {
        if (!r.current || !contenu.current) return resoudre(0);
        r.current.measureLayout(contenu.current, (_x, y) => resoudre(y), () => resoudre(0));
      }),
    []
  );

  const montrer = useCallback(async () => {
    if (!actif.current) return;
    const y = await position(actif.current);
    defilement.current?.scrollTo({ y: Math.max(0, y - MARGE_AU_DESSUS_DU_CHAMP), animated: true });
  }, [position]);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const ouvert = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      // Le clavier ne recouvre que le bas de cet écran : la barre d'onglets est déjà comptée.
      racine.current?.measureInWindow((_x, y, _l, h) => {
        setRecouvrement(Math.max(0, y + h - e.endCoordinates.screenY));
        requestAnimationFrame(() => void montrer());
      });
    });
    const ferme = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setRecouvrement(0));
    return () => {
      ouvert.remove();
      ferme.remove();
    };
  }, [montrer]);

  const clavier = useMemo<Clavier>(
    () => ({
      inscrire: (r) => {
        champs.current.add(r);
        return () => champs.current.delete(r);
      },
      auFocus: (r) => {
        actif.current = r;
        void montrer();
      },
      deplacer: async (r, sens) => {
        const courant = r ?? actif.current;
        const liste = [...champs.current].filter((x) => x.current);
        const ys = await Promise.all(liste.map(position));
        const ordre = liste.map((x, i) => ({ x, y: ys[i] })).sort((a, b) => a.y - b.y).map((e) => e.x);
        const cible = ordre[ordre.indexOf(courant as RefChamp) + sens];
        if (cible) cible.current?.focus();
        else Keyboard.dismiss();
      },
    }),
    [montrer, position]
  );

  const clavierOuvert = recouvrement > 0;
  return (
    <ClavierContexte.Provider value={clavier}>
      <View ref={racine} style={[styles.racine, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: recouvrement }]}>
        {sansDefilement ? (
          <View style={styles.contenuFixe}>{children}</View>
        ) : (
          <ScrollView ref={defilement} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contenu}>
            <View ref={contenu} style={styles.limite}>
              {children}
            </View>
          </ScrollView>
        )}
        {clavierOuvert ? (
          <View style={[styles.barre, { backgroundColor: c.surface, borderTopColor: c.bordure }]}>
            <Touche texte={t('clavier.precedent')} onPress={() => clavier.deplacer(null, -1)} />
            <Touche texte={t('clavier.suivant')} onPress={() => clavier.deplacer(null, 1)} />
            <View style={styles.flex} />
            <Touche testID="fermer-clavier" gras texte={t('clavier.ok')} onPress={() => Keyboard.dismiss()} />
          </View>
        ) : pied ? (
          <View style={[styles.pied, { paddingBottom: insets.bottom + espace.m, borderTopColor: c.bordure }]}>{pied}</View>
        ) : null}
      </View>
    </ClavierContexte.Provider>
  );
}

function Touche({ texte, onPress, gras, testID }: { texte: string; onPress: () => void; gras?: boolean; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable testID={testID} accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.touche}>
      <T gras={gras} couleur={c.primary}>
        {texte}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1 },
  flex: { flex: 1 },
  contenu: { padding: espace.m, alignItems: 'center' },
  contenuFixe: { flex: 1, padding: espace.m },
  limite: { width: '100%', maxWidth: 560, gap: espace.m },
  pied: { paddingHorizontal: espace.m, paddingTop: espace.m, borderTopWidth: StyleSheet.hairlineWidth, gap: espace.s },
  barre: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: espace.s, borderTopWidth: StyleSheet.hairlineWidth },
  touche: { minHeight: 44, paddingHorizontal: espace.m, justifyContent: 'center' },
});
