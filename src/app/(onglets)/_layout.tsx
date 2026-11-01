import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { Icone } from '@/components/Icone';
import { t } from '@/i18n';
import { useSession } from '@/lib/auth';
import { useTheme } from '@/theme';

export default function Onglets() {
  const { c } = useTheme();
  const { moi } = useSession();
  const { width } = useWindowDimensions();
  const nbOnglets = moi?.role === 'referent' || moi?.role === 'admin' ? 6 : 4;
  // Sous 64 px par onglet, les libellés seraient coupés : les icônes suffisent.
  const libelles = width / nbOnglets >= 64;
  const referent = moi?.role === 'referent' || moi?.role === 'admin';
  const nonLues = moi?.notifications_non_lues ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: libelles,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.bordure },
      }}>
      <Tabs.Screen name="liens" options={{ title: t('onglets.liens'), tabBarAccessibilityLabel: t('onglets.liens'), tabBarIcon: ({ color }) => <Icone nom="liens" couleur={color} /> }} />
      <Tabs.Screen name="arbre" options={{ title: t('onglets.arbre'), tabBarAccessibilityLabel: t('onglets.arbre'), tabBarIcon: ({ color }) => <Icone nom="arbre" couleur={color} /> }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('onglets.notifications'), tabBarAccessibilityLabel: t('onglets.notifications'),
          tabBarBadge: nonLues > 0 ? nonLues : undefined,
          tabBarIcon: ({ color }) => <Icone nom="notifications" couleur={color} />,
        }}
      />
      <Tabs.Screen name="referent" options={{ href: referent ? undefined : null, title: t('onglets.referent'), tabBarAccessibilityLabel: t('onglets.referent'), tabBarIcon: ({ color }) => <Icone nom="referent" couleur={color} /> }} />
      <Tabs.Screen name="suivi" options={{ href: referent ? undefined : null, title: t('onglets.suivi'), tabBarAccessibilityLabel: t('onglets.suivi'), tabBarIcon: ({ color }) => <Icone nom="suivi" couleur={color} /> }} />
      <Tabs.Screen name="fiche" options={{ title: t('onglets.fiche'), tabBarAccessibilityLabel: t('onglets.fiche'), tabBarIcon: ({ color }) => <Icone nom="fiche" couleur={color} /> }} />
    </Tabs>
  );
}
