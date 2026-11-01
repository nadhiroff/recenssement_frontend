import { Tabs } from 'expo-router';

import { Icone } from '@/components/Icone';
import { t } from '@/i18n';
import { useSession } from '@/lib/auth';
import { useTheme } from '@/theme';

export default function Onglets() {
  const { c } = useTheme();
  const { moi } = useSession();
  const referent = moi?.role === 'referent' || moi?.role === 'admin';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.bordure },
      }}>
      <Tabs.Screen name="liens" options={{ title: t('onglets.liens'), tabBarIcon: ({ color }) => <Icone nom="liens" couleur={color} /> }} />
      <Tabs.Screen name="fiche" options={{ title: t('onglets.fiche'), tabBarIcon: ({ color }) => <Icone nom="fiche" couleur={color} /> }} />
    </Tabs>
  );
}
