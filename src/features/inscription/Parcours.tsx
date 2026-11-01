import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';

import { Ecran } from '@/components/Ecran';
import { BarreProgression, Bouton, Carte, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api, ErreurApi } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { ajouterEnvoi } from '@/lib/file';
import { useReseau } from '@/lib/reseau';
import { useTheme } from '@/theme';
import { DUREE, espace } from '@/theme/tokens';

import { CarteCandidat, type Candidat } from './CarteCandidat';
import { EtapeBranche, EtapeIdentite, EtapeType, EtapeVerification } from './Etapes';
import { EtapeParent } from './EtapeParent';
import {
  type Brouillon,
  brouillonSchema,
  brouillonVide,
  construireCorps,
  ecrireBrouillon,
  effacerBrouillon,
  lireBrouillon,
  type Parcours as TypeParcours,
} from './modele';

type Etape = 'type' | 'identite' | 'branche' | 'pere' | 'mere' | 'verification';
type Resolution = { cible: 'identite' | 'pere' | 'mere'; candidats: Candidat[] };

const glisser = (versAvant: boolean) => ({
  entering: (versAvant ? SlideInRight : SlideInLeft).duration(DUREE.normale).reduceMotion(ReduceMotion.System),
  exiting: (versAvant ? SlideOutLeft : SlideOutRight).duration(DUREE.normale).reduceMotion(ReduceMotion.System),
});

export function Parcours({ parcours }: { parcours: TypeParcours }) {
  const [initial, setInitial] = useState<Brouillon | null>(null);

  useEffect(() => {
    lireBrouillon(parcours).then((b) => setInitial(b ?? brouillonVide()));
  }, [parcours]);

  if (!initial) {
    return (
      <Ecran>
        <Squelette hauteur={160} />
        <Squelette />
      </Ecran>
    );
  }
  return <Formulaire parcours={parcours} initial={initial} />;
}

function Formulaire({ parcours, initial }: { parcours: TypeParcours; initial: Brouillon }) {
  const { c } = useTheme();
  const { recharger } = useSession();
  const { synchroniser, enLigne, refus, oublierRefus } = useReseau();
  const form = useForm<Brouillon>({ resolver: zodResolver(brouillonSchema), defaultValues: initial, mode: 'onTouched' });
  const etapes = useMemo<Etape[]>(
    () => (parcours === 'tiers' ? ['type', 'identite', 'branche', 'pere', 'mere', 'verification'] : ['identite', 'branche', 'pere', 'mere', 'verification']),
    [parcours]
  );
  const [index, setIndex] = useState(Math.min(initial.etape, etapes.length - 1));
  const [versAvant, setVersAvant] = useState(true);
  const [erreur, setErreur] = useState<string>();
  const [occupe, setOccupe] = useState(false);
  const [enFile, setEnFile] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api<{ id: number; nom: string; description: string | null }[]>('GET', '/branches'), staleTime: 3600_000 });

  // Brouillon sauvegardé à chaque champ.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => void ecrireBrouillon(parcours, values),
    });
  }, [form, parcours]);

  const aller = (cible: number) => {
    setVersAvant(cible > index);
    setErreur(undefined);
    setIndex(cible);
    form.setValue('etape', cible);
  };

  const terminer = useCallback(() => {
    void effacerBrouillon(parcours);
    void recharger();
    router.replace('/liens');
  }, [parcours, recharger]);

  const traiterRefus = useCallback(
    (e: ErreurApi) => {
      if (e.code === 'rapprochement_requis') {
        setResolution({ cible: (e.extra.cible as Resolution['cible']) ?? 'pere', candidats: (e.extra.candidats as Candidat[]) ?? [] });
      } else if (e.code === 'deja_inscrit') {
        terminer();
      } else {
        setErreur(e.message);
      }
    },
    [terminer]
  );

  // Refus survenu pendant un rejeu automatique, y compris après réouverture de l'application.
  const cleCourante = useRef(initial.client_uuid);
  useEffect(() => {
    if (refus && refus.envoi.client_uuid === cleCourante.current) {
      traiterRefus(refus.erreur);
      oublierRefus();
    }
  }, [refus, oublierRefus, traiterRefus]);

  const envoyer = async () => {
    const b = form.getValues();
    if (!b.consentement) {
      setErreur(t('consentement.obligatoire'));
      return;
    }
    setOccupe(true);
    setErreur(undefined);
    const chemin = parcours === 'tiers' ? '/inscriptions/tiers' : '/inscriptions';
    await ecrireBrouillon(parcours, b);
    await ajouterEnvoi({ client_uuid: b.client_uuid, chemin, corps: construireCorps(b, parcours) });
    const issues = await synchroniser();
    setOccupe(false);
    const issue = issues.find((i) => i.envoi.client_uuid === b.client_uuid);
    if (issue?.type === 'reussi') {
      terminer();
    } else if (issue?.type === 'refuse') {
      oublierRefus();
      traiterRefus(issue.erreur);
    } else {
      setEnFile(true);
    }
  };

  const resoudre = (candidat: Candidat | null) => {
    if (!resolution) return;
    const { cible } = resolution;
    const id = candidat && 'personne' in candidat ? candidat.personne.id : null;
    if (cible === 'identite') {
      if (id) form.setValue('personne_existante_id', id);
      else form.setValue('identite.rapprochement_vu', true);
    } else if (id && candidat && 'personne' in candidat) {
      form.setValue(cible, { ...form.getValues(cible), mode: 'existante', personne_id: id, apercu: candidat.personne.nom_complet });
    } else {
      form.setValue(`${cible}.rapprochement_vu`, true);
    }
    setResolution(null);
    void envoyer();
  };

  const suivant = async () => {
    const etape = etapes[index];
    const message = await validerEtape(etape, form);
    if (message === true) aller(index + 1);
    else setErreur(message);
  };

  const etape = etapes[index];
  const derniere = etape === 'verification';

  return (
    <FormProvider {...form}>
      <Ecran
        pied={
          <View style={styles.pied}>
            {index > 0 ? (
              <View style={styles.flex}>
                <Bouton variante="contour" titre={t('commun.retour')} onPress={() => aller(index - 1)} />
              </View>
            ) : null}
            <View style={styles.flex}>
              {derniere ? (
                <Bouton testID="envoyer" titre={t('inscription.envoyer')} chargement={occupe} desactive={enFile} onPress={envoyer} />
              ) : (
                <Bouton testID="suivant" titre={t('commun.continuer')} onPress={suivant} />
              )}
            </View>
          </View>
        }>
        <Muet v="petit">{t('inscription.etape', { n: index + 1, total: etapes.length })}</Muet>
        <T v="titre" couleur={c.primary}>
          {t(`inscription.etapes.${etape}`)}
        </T>
        <BarreProgression valeur={(index + 1) / etapes.length} />
        <Animated.View key={etape} {...glisser(versAvant)} style={styles.etape}>
          {etape === 'type' ? <EtapeType /> : null}
          {etape === 'identite' ? <EtapeIdentite /> : null}
          {etape === 'branche' ? <EtapeBranche branches={branches.data} chargement={branches.isPending} /> : null}
          {etape === 'pere' || etape === 'mere' ? <EtapeParent role={etape} enLigne={enLigne} /> : null}
          {etape === 'verification' ? (
            <EtapeVerification parcours={parcours} branches={branches.data} allerA={(e) => aller(etapes.indexOf(e))} />
          ) : null}
        </Animated.View>
        <Erreur>{erreur}</Erreur>
        {enFile ? (
          <Carte>
            <T>{t('inscription.enFile')}</T>
          </Carte>
        ) : null}
      </Ecran>
      <Modal visible={!!resolution} animationType="slide" onRequestClose={() => setResolution(null)}>
        <View style={[styles.flex, { backgroundColor: c.background }]}>
          <ScrollView contentContainerStyle={styles.modale}>
            <T v="titre">{t('inscription.resoudreTitre')}</T>
            <Muet>{resolution?.cible === 'identite' && parcours === 'soi' ? t('inscription.resoudreSoi') : t('inscription.resoudreTexte')}</Muet>
            {resolution?.candidats.map((cand, i) => (
              <CarteCandidat key={i} candidat={cand} rang={i} cestMoi={resolution.cible === 'identite' && parcours === 'soi'} onChoisir={() => resoudre(cand)} />
            ))}
            <Bouton testID="nouvelle-fiche" variante="contour" titre={resolution?.cible === 'identite' && parcours === 'soi' ? t('inscription.pasMoi') : t('inscription.pasLui')} onPress={() => resoudre(null)} />
          </ScrollView>
        </View>
      </Modal>
    </FormProvider>
  );
}

async function validerEtape(
  etape: Etape,
  form: UseFormReturn<Brouillon>
): Promise<true | string> {
  const v = form.getValues();
  switch (etape) {
    case 'type':
      if (!v.type) return t('tiers.typeObligatoire');
      if (v.type === 'aine' && !v.present_lors_saisie) return t('tiers.presentObligatoire');
      return true;
    case 'identite':
      if (await form.trigger('identite')) return true;
      return form.getFieldState('identite.jour_naissance').error ? t('erreurs.date') : t('erreurs.requis');
    case 'branche':
      return v.branche_id ? true : t('inscription.brancheObligatoire');
    case 'pere':
    case 'mere': {
      const p = v[etape];
      if (p.mode === 'a_choisir' && p.prenoms.trim() !== '' && p.nom_famille.trim() !== '') {
        form.setValue(`${etape}.mode`, 'nouvelle');
        return (await form.trigger(etape)) ? true : t('erreurs.annee');
      }
      if (p.mode === 'a_choisir') return t('inscription.parentObligatoire');
      return (await form.trigger(etape)) ? true : t('erreurs.annee');
    }
    default:
      return true;
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pied: { flexDirection: 'row', gap: espace.s },
  etape: { gap: espace.m },
  modale: { padding: espace.m, paddingTop: espace.xl, gap: espace.m },
});
