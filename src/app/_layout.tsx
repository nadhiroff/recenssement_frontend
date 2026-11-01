import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BandeauHorsLigne } from '@/components/BandeauHorsLigne';
import { effacerBrouillon, type Parcours } from '@/features/inscription/modele';
import { SessionFournie, useSession } from '@/lib/auth';
import { ReseauFourni } from '@/lib/reseau';
import { ThemeFourni, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const client = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 7 * 24 * 3600 * 1000, staleTime: 30_000, retry: 1, networkMode: 'offlineFirst' },
  },
});
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'cache_requetes', throttleTime: 2000 });

const ECRANS_PUBLICS = ['accueil', 'connexion', 'code', 'confirmation'];

function Navigation() {
  const { sombre, c } = useTheme();
  const { pret, recharger, connecte } = useSession();
  const segments = useSegments();

  // Déconnexion, retrait ou session expirée : retour à l'accueil, où que l'on soit.
  useEffect(() => {
    if (pret && !connecte && segments[0] && !ECRANS_PUBLICS.includes(segments[0])) {
      router.replace('/accueil');
    }
  }, [pret, connecte, segments]);

  useEffect(() => {
    if (pret) SplashScreen.hideAsync().catch(() => {});
  }, [pret]);

  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      const racine = window.location.pathname.split('/app')[0];
      navigator.serviceWorker.register(`${racine}/app/sw.js`).catch(() => {});
    }
  }, []);

  if (!pret) return <View style={[styles.flex, { backgroundColor: c.background }]} />;

  return (
    <ReseauFourni
      surReussite={(envoi) => {
        const parcours: Parcours = envoi.chemin.endsWith('/tiers') ? 'tiers' : 'soi';
        void effacerBrouillon(parcours);
        if (connecte) void recharger();
      }}>
      <ThemeProvider value={sombre ? DarkTheme : DefaultTheme}>
        <StatusBar style={sombre ? 'light' : 'dark'} />
        <BandeauHorsLigne />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }} />
      </ThemeProvider>
    </ReseauFourni>
  );
}

export default function Racine() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <PersistQueryClientProvider client={client} persistOptions={{ persister, maxAge: 7 * 24 * 3600 * 1000 }}>
        <ThemeFourni>
          <SessionFournie>
            <Navigation />
          </SessionFournie>
        </ThemeFourni>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
