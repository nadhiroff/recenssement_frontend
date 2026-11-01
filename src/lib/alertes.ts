import AsyncStorage from '@react-native-async-storage/async-storage';
import { focusManager, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { t } from '@/i18n';

import { api } from './api';
import { useSession } from './auth';

export const CLE_JETON_PUSH = 'jeton_push';
const CANAL = 'alertes';
const natif = Platform.OS !== 'web';

if (natif) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export type EtatAlertes = 'accordees' | 'refusees' | 'a_demander' | 'indisponibles';

export async function lireEtatAlertes(): Promise<EtatAlertes> {
  if (!natif) return 'indisponibles';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'accordees';
  return canAskAgain ? 'a_demander' : 'refusees';
}

/** Demande l'autorisation si besoin, puis déclare ce téléphone au serveur. Rend vrai si le push est actif. */
export async function activerAlertes(): Promise<boolean> {
  if (!natif) return false;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: t('notifications.titre'),
    // eslint-disable-next-line import/namespace -- exporté par le module, non vu par le résolveur d'ESLint
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api('POST', '/me/appareils', { token: data, plateforme: Platform.OS });
    await AsyncStorage.setItem(CLE_JETON_PUSH, data);
    return true;
  } catch {
    // Expo Go sur Android ne sait plus recevoir de push : les alertes locales prennent le relais.
    return false;
  }
}

/** Application ouverte, sans push : l'alerte système est produite sur le téléphone. */
async function alerteLocale(corps: string) {
  await Notifications.scheduleNotificationAsync({ content: { title: t('app.nom'), body: corps }, trigger: null });
}

/** Tenu par la racine de l'application : alertes système, pastille et rafraîchissement. */
export function useGestionAlertes() {
  const client = useQueryClient();
  const { connecte, moi, recharger } = useSession();
  const pushActif = useRef(false);
  const precedent = useRef<number | null>(null);
  const nonLues = moi?.notifications_non_lues;

  // React Query ne connaît pas le premier plan sur téléphone : on le lui dit.
  useEffect(() => {
    if (!natif) return;
    const abonnement = AppState.addEventListener('change', (etat) => focusManager.setFocused(etat === 'active'));
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (!natif || !connecte) return;
    let actif = true;
    activerAlertes().then((ok) => {
      if (actif) pushActif.current = ok;
    });
    const recue = Notifications.addNotificationReceivedListener(() => {
      client.invalidateQueries({ queryKey: ['notifications'] });
      void recharger();
    });
    const ouvrir = () => router.push('/notifications');
    const touchee = Notifications.addNotificationResponseReceivedListener(ouvrir);
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        ouvrir();
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    return () => {
      actif = false;
      recue.remove();
      touchee.remove();
    };
  }, [client, connecte, recharger]);

  // Pastille de l'icône, et alerte locale quand une nouveauté arrive sans push.
  useEffect(() => {
    if (!natif) return;
    if (!connecte || nonLues === undefined) {
      precedent.current = null;
      if (!connecte) void Notifications.setBadgeCountAsync(0);
      return;
    }
    const avant = precedent.current;
    precedent.current = nonLues;
    void Notifications.setBadgeCountAsync(nonLues);
    if (avant !== null && nonLues > avant && !pushActif.current) {
      client.invalidateQueries({ queryKey: ['notifications'] });
      void alerteLocale(t('notifications.nouvelle'));
    }
  }, [client, connecte, nonLues]);
}

export function useEtatAlertes() {
  const [etat, setEtat] = useState<EtatAlertes>('indisponibles');
  const actualiser = useCallback(() => lireEtatAlertes().then(setEtat), []);
  useEffect(() => {
    void actualiser();
    const abonnement = AppState.addEventListener('change', (e) => {
      if (e === 'active') void actualiser();
    });
    return () => abonnement.remove();
  }, [actualiser]);
  return { etat, actualiser };
}
