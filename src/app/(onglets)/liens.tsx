import { Ecran } from '@/components/Ecran';
import { Carte, T } from '@/components/ui';
import { t } from '@/i18n';

export default function Liens() {
  return (
    <Ecran>
      <T v="titre">{t('onglets.liens')}</T>
      <Carte>
        <T>{t('inscription.merci')}</T>
      </Carte>
    </Ecran>
  );
}
