import { Redirect } from 'expo-router';

import { Ecran } from '@/components/Ecran';
import { Squelette } from '@/components/ui';
import { useSession } from '@/lib/auth';

export default function Aiguillage() {
  const { connecte, moi, chargementMoi } = useSession();
  if (!connecte) return <Redirect href="/accueil" />;
  if (chargementMoi) {
    return (
      <Ecran>
        <Squelette />
        <Squelette />
      </Ecran>
    );
  }
  return <Redirect href={moi?.personne ? '/liens' : '/consentement'} />;
}
