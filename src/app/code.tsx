import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Ecran } from '@/components/Ecran';
import { Bouton, Erreur, Muet, T } from '@/components/ui';
import { DELAI_RENVOI_OTP } from '@/config';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { vibrerSucces } from '@/lib/retour';
import { useTheme } from '@/theme';
import { espace, rayon } from '@/theme/tokens';

const CASES = [0, 1, 2, 3, 4, 5];

export default function Code() {
  const { telephone, destination } = useLocalSearchParams<{ telephone: string; destination?: string }>();
  const { ouvrir } = useSession();
  const { c, echelle } = useTheme();
  const champ = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [occupe, setOccupe] = useState(false);
  const [attente, setAttente] = useState(DELAI_RENVOI_OTP);

  useEffect(() => {
    const m = setInterval(() => setAttente((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(m);
  }, []);

  const verifier = async (valeur: string) => {
    if (valeur.length !== 6) {
      setErreur(t('erreurs.code'));
      return;
    }
    setErreur(undefined);
    setOccupe(true);
    try {
      const { token } = await api<{ token: string }>('POST', '/auth/otp/verify', { telephone, code: valeur });
      await ouvrir(token);
      vibrerSucces();
      router.replace('/');
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  };

  const saisir = (texte: string) => {
    const propre = texte.replace(/\D/g, '').slice(0, 6);
    setCode(propre);
    if (propre.length === 6) void verifier(propre);
  };

  const renvoyer = async () => {
    setAttente(DELAI_RENVOI_OTP);
    try {
      await api('POST', '/auth/otp/request', { telephone });
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  return (
    <Ecran pied={<Bouton testID="verifier" titre={t('connexion.verifier')} chargement={occupe} onPress={() => verifier(code)} />}>
      <T v="titre">{t('connexion.codeTitre')}</T>
      <Muet>{destination ? t('connexion.codeEnvoyeA', { adresse: destination }) : t('connexion.codeTexteEmail')}</Muet>
      <Pressable onPress={() => champ.current?.focus()} style={styles.cases} accessibilityLabel={t('connexion.codeTitre')}>
        {CASES.map((i) => (
          <View key={i} style={[styles.case, { backgroundColor: c.surface, borderColor: i === code.length ? c.secondary : c.bordure }]}>
            <T gras style={{ fontSize: 24 * echelle, lineHeight: 30 * echelle }}>
              {code[i] ?? ''}
            </T>
          </View>
        ))}
        <TextInput
          ref={champ}
          testID="saisie-code"
          value={code}
          onChangeText={saisir}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={32}
          caretHidden
          style={styles.invisible}
        />
      </Pressable>
      <Erreur>{erreur}</Erreur>
      <Bouton
        variante="texte"
        desactive={attente > 0}
        titre={attente > 0 ? t('connexion.renvoyerDans', { s: attente }) : t('connexion.renvoyer')}
        onPress={renvoyer}
      />
      <Bouton variante="texte" titre={t('connexion.changerNumero')} onPress={() => router.back()} />
      <Muet v="petit">{t('connexion.aide')}</Muet>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  cases: { flexDirection: 'row', justifyContent: 'space-between', gap: espace.s },
  case: { flex: 1, aspectRatio: 0.85, maxHeight: 64, borderWidth: 1.5, borderRadius: rayon.m, alignItems: 'center', justifyContent: 'center' },
  invisible: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
});
