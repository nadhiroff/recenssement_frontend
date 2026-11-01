import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Ecran } from '@/components/Ecran';
import { Bouton, Champ, Erreur, Muet, T } from '@/components/ui';
import { INDICATIF_DEFAUT } from '@/config';
import { t } from '@/i18n';
import { api, ErreurApi } from '@/lib/api';
import { normaliserTelephone, telephoneValide } from '@/lib/telephone';

const schema = z.object({
  telephone: z.string().transform(normaliserTelephone).refine(telephoneValide, 'erreurs.telephone'),
  email: z.string().trim().pipe(z.union([z.literal(''), z.email('erreurs.email')])),
});
type Saisie = z.input<typeof schema>;

export default function Connexion() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const creation = mode === 'creation';
  const [emailRequis, setEmailRequis] = useState(creation);
  const [numeroInconnu, setNumeroInconnu] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const { control, handleSubmit, formState } = useForm<Saisie, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { telephone: INDICATIF_DEFAUT, email: '' },
  });

  const envoyer = handleSubmit(async ({ telephone, email }) => {
    setErreur(undefined);
    try {
      const { destination } = await api<{ destination: string | null }>('POST', '/auth/otp/request', { telephone, email: email || undefined });
      router.push({ pathname: '/code', params: { telephone, destination: destination ?? '' } });
    } catch (e) {
      if (e instanceof ErreurApi && e.code === 'email_requis') {
        setEmailRequis(true);
        setNumeroInconnu(true);
      } else {
        setErreur((e as Error).message);
      }
    }
  });

  return (
    <Ecran pied={<Bouton testID="recevoir" titre={t('connexion.recevoir')} chargement={formState.isSubmitting} onPress={envoyer} />}>
      <T v="titre">{creation ? t('connexion.titreCreation') : t('connexion.titre')}</T>
      <Muet>{creation ? t('connexion.texteCreation') : t('connexion.texte')}</Muet>
      <Controller
        control={control}
        name="telephone"
        render={({ field, fieldState }) => (
          <Champ
            label={t('connexion.telephone')}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message && t(fieldState.error.message)}
          />
        )}
      />
      {emailRequis ? (
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Champ
              label={t('connexion.email')}
              aide={t('connexion.emailAide')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erreur={fieldState.error?.message && t(fieldState.error.message)}
            />
          )}
        />
      ) : null}
      {numeroInconnu ? <Muet>{t('connexion.numeroInconnu')}</Muet> : null}
      <Erreur>{erreur}</Erreur>
      <Muet v="petit">{t('connexion.aide')}</Muet>
    </Ecran>
  );
}
