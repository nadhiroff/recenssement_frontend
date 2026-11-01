import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Ecran } from '@/components/Ecran';
import { Bouton, Carte, Champ, Dialogue, Erreur, Muet, T } from '@/components/ui';
import { EtapeIdentite } from '@/features/inscription/Etapes';
import { identiteSchema, TYPES_NOMS } from '@/features/inscription/modele';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { vibrerSucces } from '@/lib/retour';
import { espace } from '@/theme/tokens';

const SEUIL_GLISSEMENT = 24;

const schema = z.object({ identite: identiteSchema });
type Formulaire = z.infer<typeof schema>;
type TypeAutre = (typeof TYPES_NOMS)[number];

function EmailConnexion() {
  const { moi, recharger } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const demander = useMutation({ mutationFn: () => api('POST', '/me/email', { email: email.trim() }) });
  const confirmer = useMutation({
    mutationFn: () => api('POST', '/me/email/confirmer', { code: code.trim() }),
    onSuccess: async () => {
      vibrerSucces();
      await recharger();
      demander.reset();
      setEmail('');
      setCode('');
    },
  });
  return (
    <Carte>
      <T v="sousTitre">{t('fiche.emailConnexion')}</T>
      <Muet>{moi?.email}</Muet>
      <Champ label={t('fiche.nouvelEmail')} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      {demander.isSuccess ? (
        <>
          <Champ label={t('fiche.codeEmail')} keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
          <Bouton titre={t('fiche.confirmerEmail')} chargement={confirmer.isPending} onPress={() => confirmer.mutate()} />
        </>
      ) : (
        <Bouton variante="contour" titre={t('fiche.recevoirCode')} desactive={email.trim() === ''} chargement={demander.isPending} onPress={() => demander.mutate()} />
      )}
      {confirmer.isSuccess ? <Muet>{t('fiche.emailChange')}</Muet> : null}
      <Erreur>{demander.error?.message ?? confirmer.error?.message}</Erreur>
      <Muet v="petit">{t('fiche.numeroAide')}</Muet>
    </Carte>
  );
}

export default function FicheModifier() {
  const { moi, recharger } = useSession();
  const client = useQueryClient();
  const p = moi?.personne;
  const nom = (type: string) => p?.noms.find((n) => n.type === type)?.valeur ?? '';
  const form = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: {
      identite: {
        nom_famille: nom('nom_famille'),
        prenoms: nom('naissance'),
        autres_noms: (p?.noms ?? [])
          .filter((n) => (TYPES_NOMS as readonly string[]).includes(n.type))
          .map((n) => ({ type: n.type as TypeAutre, valeur: n.valeur })),
        sexe: p?.sexe ?? 'I',
        jour_naissance: p?.jour_naissance ? String(p.jour_naissance) : '',
        mois_naissance: p?.mois_naissance ? String(p.mois_naissance) : '',
        annee_naissance: p?.annee_naissance ? String(p.annee_naissance) : '',
        precision_naissance: (p?.precision_naissance ?? 'environ') as Formulaire['identite']['precision_naissance'],
        lieu_residence: p?.lieu_residence ?? '',
        rapprochement_vu: true,
      },
    },
  });

  const { isDirty } = useFormState({ control: form.control });
  const [sortieAutorisee, setSortieAutorisee] = useState(false);
  const [question, setQuestion] = useState(false);

  // Tout départ qui n'est pas un choix explicite pose la question : geste d'iOS, touche retour d'Android.
  usePreventRemove(!sortieAutorisee, () => setQuestion(true));

  const annuler = () => {
    if (isDirty) setQuestion(true);
    else setSortieAutorisee(true);
  };

  // Le retour natif est coupé pour cet écran dans le layout : ce bord le remplace et passe par la question.
  const departGlissement = useRef(0);
  const glissementTraite = useRef(false);

  useEffect(() => {
    if (sortieAutorisee) router.back();
  }, [sortieAutorisee]);

  const enregistrer = useMutation({
    mutationFn: ({ identite: d }: Formulaire) =>
      api('PATCH', `/personnes/${p?.id}`, {
        nom_famille: d.nom_famille,
        prenoms: d.prenoms,
        autres_noms: d.autres_noms.filter((n) => n.valeur.trim() !== ''),
        sexe: d.sexe,
        jour_naissance: d.jour_naissance === '' ? null : Number(d.jour_naissance),
        mois_naissance: d.mois_naissance === '' ? null : Number(d.mois_naissance),
        annee_naissance: d.annee_naissance === '' ? null : Number(d.annee_naissance),
        precision_naissance: d.annee_naissance === '' ? 'inconnue' : d.precision_naissance,
        lieu_residence: d.lieu_residence,
      }),
    onSuccess: async () => {
      vibrerSucces();
      client.invalidateQueries({ queryKey: ['personne'] });
      await recharger();
      setSortieAutorisee(true);
    },
  });

  return (
    <FormProvider {...form}>
      <View style={styles.flex}>
          <Ecran
            pied={
              <>
                <Erreur>{enregistrer.error?.message}</Erreur>
                <View style={styles.pied}>
                  <View style={styles.piedBouton}>
                    <Bouton variante="contour" titre={t('commun.annuler')} onPress={annuler} />
                  </View>
                  <View style={styles.piedBouton}>
                    <Bouton
                      testID="enregistrer"
                      titre={isDirty ? t('fiche.mettreAJour') : t('commun.enregistrer')}
                      desactive={!isDirty}
                      chargement={enregistrer.isPending}
                      onPress={form.handleSubmit((d) => enregistrer.mutate(d))}
                    />
                  </View>
                </View>
              </>
            }>
            <T v="titre">{t('fiche.titreModifier')}</T>
            <EtapeIdentite />
            <EmailConnexion />
            <Dialogue
              visible={question}
              danger
              titre={t('fiche.abandonTitre')}
              texte={t('fiche.abandonTexte')}
              oui={t('fiche.abandonOui')}
              non={t('fiche.abandonNon')}
              surOui={() => {
                setQuestion(false);
                setSortieAutorisee(true);
              }}
              surNon={() => setQuestion(false)}
            />
          </Ecran>
        <View
          testID="bord-retour"
          // Sans cela, iOS supprime cette vue vide de l'affichage et elle ne reçoit aucun toucher.
          collapsable={false}
          style={styles.bord}
          accessibilityElementsHidden
          importantForAccessibility="no"
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            departGlissement.current = e.nativeEvent.pageX;
            glissementTraite.current = false;
          }}
          onResponderMove={(e) => {
            if (!glissementTraite.current && e.nativeEvent.pageX - departGlissement.current > SEUIL_GLISSEMENT) {
              glissementTraite.current = true;
              setQuestion(true);
            }
          }}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bord: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, backgroundColor: 'rgba(0,0,0,0.001)' },
  pied: { flexDirection: 'row', gap: espace.s },
  piedBouton: { flex: 1 },
});
