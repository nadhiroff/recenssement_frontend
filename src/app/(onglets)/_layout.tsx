import { Tabs } from 'expo-router';

import { Icone } from '@/components/Icone';
import { t } from '@/i18n';
import { useSession } from '@/lib/auth';
import { useTheme } from '@/theme';

export default function Onglets() {
  const { c } = useTheme();
  const { moi } = useSession();
  const referent = moi?.role === 'referent' || moi?.role === 'admin';
  const nonLues = moi?.notifications_non_lues ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.bordure },
      }}>
      <Tabs.Screen name="liens" options={{ title: t('onglets.liens'), tabBarIcon: ({ color }) => <Icone nom="liens" couleur={color} /> }} />
      <Tabs.Screen name="arbre" options={{ title: t('onglets.arbre'), tabBarIcon: ({ color }) => <Icone nom="arbre" couleur={color} /> }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('onglets.notifications'),
          tabBarBadge: nonLues > 0 ? nonLues : undefined,
          tabBarIcon: ({ color }) => <Icone nom="notifications" couleur={color} />,
        }}
      />
      <Tabs.Screen name="referent" options={{ href: referent ? undefined : null, title: t('onglets.referent'), tabBarIcon: ({ color }) => <Icone nom="referent" couleur={color} /> }} />
      <Tabs.Screen name="suivi" options={{ href: referent ? undefined : null, title: t('onglets.suivi'), tabBarIcon: ({ color }) => <Icone nom="suivi" couleur={color} /> }} />
      <Tabs.Screen name="fiche" options={{ title: t('onglets.fiche'), tabBarIcon: ({ color }) => <Icone nom="fiche" couleur={color} /> }} />
    </Tabs>
  );
}
