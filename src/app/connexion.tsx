import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Ecran } from '@/components/Ecran';
import { Bouton, Champ, Erreur, Muet, T } from '@/components/ui';
import { INDICATIF_DEFAUT } from '@/config';
import { t } from '@/i18n';
import { api, ErreurApi } from '@/lib/api';

const schema = z.object({
  telephone: z.string().transform((v) => v.replace(/[\s().-]/g, '')).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'erreurs.telephone')),
  email: z.string().trim().pipe(z.union([z.literal(''), z.email('erreurs.email')])),
});
type Saisie = z.input<typeof schema>;

export default function Connexion() {
  const [emailRequis, setEmailRequis] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const { control, handleSubmit, formState } = useForm<Saisie, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { telephone: INDICATIF_DEFAUT, email: '' },
  });

  const envoyer = handleSubmit(async ({ telephone, email }) => {
    setErreur(undefined);
    try {
      await api('POST', '/auth/otp/request', { telephone, email: email || undefined });
      router.push({ pathname: '/code', params: { telephone } });
    } catch (e) {
      if (e instanceof ErreurApi && e.code === 'email_requis') setEmailRequis(true);
      else setErreur((e as Error).message);
    }
  });

  return (
    <Ecran pied={<Bouton testID="recevoir" titre={t('connexion.recevoir')} chargement={formState.isSubmitting} onPress={envoyer} />}>
      <T v="titre">{t('connexion.titre')}</T>
      <Muet>{t('connexion.texte')}</Muet>
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
      <Erreur>{erreur}</Erreur>
    </Ecran>
  );
}
