import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bouton, Carte, Case, Champ, Choix, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { useSession } from '@/lib/auth';
import { useTheme } from '@/theme';
import { espace, rayon } from '@/theme/tokens';

import { type Brouillon, type ParentBrouillon, PRECISIONS, type Parcours, TYPES_NOMS, TYPES_TIERS } from './modele';

const messageDe = (e?: { message?: string }) => (e?.message ? t(e.message) : undefined);

export function EtapeType() {
  const { control, setValue } = useFormContext<Brouillon>();
  const { moi } = useSession();
  const type = useWatch({ control, name: 'type' });
  const present = useWatch({ control, name: 'present_lors_saisie' });
  const relais = !!moi && (moi.branches_relais.length > 0 || moi.branches_referent.length > 0 || moi.role === 'admin');
  const options = TYPES_TIERS.filter((v) => relais || v === 'enfant_mineur' || v === 'parent_decede');
  return (
    <View style={styles.pile}>
      <Choix valeur={type} onChange={(v) => setValue('type', v)} options={options.map((v) => ({ valeur: v, libelle: t(`tiers.types.${v}`) }))} />
      {type === 'aine' ? (
        <Case coche={present} onChange={(v) => setValue('present_lors_saisie', v)}>
          {t('tiers.present')}
        </Case>
      ) : null}
    </View>
  );
}

export function EtapeIdentite() {
  const { control, setValue } = useFormContext<Brouillon>();
  const { fields, append, remove } = useFieldArray({ control, name: 'identite.autres_noms' });
  return (
    <View style={styles.pile}>
      <Controller
        control={control}
        name="identite.nom_famille"
        render={({ field, fieldState }) => (
          <Champ testID="nom-famille" label={t('inscription.nomFamille')} autoCapitalize="characters" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} erreur={messageDe(fieldState.error)} />
        )}
      />
      <Controller
        control={control}
        name="identite.prenoms"
        render={({ field, fieldState }) => (
          <Champ testID="prenoms" label={t('inscription.prenoms')} autoCapitalize="words" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} erreur={messageDe(fieldState.error)} />
        )}
      />
      {fields.map((f, i) => (
        <Carte key={f.id}>
          <Controller
            control={control}
            name={`identite.autres_noms.${i}.type`}
            render={({ field }) => (
              <Choix valeur={field.value} onChange={field.onChange} options={TYPES_NOMS.map((v) => ({ valeur: v, libelle: t(`inscription.typeNom.${v}`) }))} />
            )}
          />
          <Controller
            control={control}
            name={`identite.autres_noms.${i}.valeur`}
            render={({ field }) => <Champ label={t('inscription.autresNoms')} value={field.value} onChangeText={field.onChange} />}
          />
          <Bouton variante="texte" titre={t('commun.annuler')} onPress={() => remove(i)} />
        </Carte>
      ))}
      <Bouton variante="texte" titre={t('inscription.ajouterNom')} onPress={() => append({ type: 'vodoun', valeur: '' })} />
      <Controller
        control={control}
        name="identite.sexe"
        render={({ field }) => (
          <Choix label={t('inscription.sexe')} valeur={field.value} onChange={field.onChange} options={(['M', 'F', 'I'] as const).map((v) => ({ valeur: v, libelle: t(`inscription.sexes.${v}`) }))} />
        )}
      />
      <Controller
        control={control}
        name="identite.annee_naissance"
        render={({ field, fieldState }) => (
          <Champ testID="annee" label={t('inscription.anneeNaissance')} aide={t('inscription.anneeAide')} keyboardType="number-pad" maxLength={4} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} erreur={messageDe(fieldState.error)} />
        )}
      />
      <Controller
        control={control}
        name="identite.precision_naissance"
        render={({ field }) => (
          <Choix label={t('inscription.precision')} valeur={field.value} onChange={(v) => { field.onChange(v); if (v === 'inconnue') setValue('identite.annee_naissance', ''); }} options={PRECISIONS.map((p) => ({ valeur: p, libelle: t(`inscription.precisions.${p}`) }))} />
        )}
      />
      <Controller
        control={control}
        name="identite.lieu_residence"
        render={({ field }) => <Champ label={t('inscription.lieu')} value={field.value} onChangeText={field.onChange} />}
      />
    </View>
  );
}

export function EtapeBranche({ branches, chargement }: { branches?: { id: number; nom: string; description: string | null }[]; chargement: boolean }) {
  const { control, setValue } = useFormContext<Brouillon>();
  const { c } = useTheme();
  const choisie = useWatch({ control, name: 'branche_id' });
  if (chargement && !branches) return <Squelette hauteur={200} />;
  return (
    <View style={styles.pile}>
      <Muet>{t('inscription.brancheAide')}</Muet>
      {branches?.map((b) => {
        const actif = b.id === choisie;
        return (
          <Pressable
            key={b.id}
            testID={`branche-${b.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            onPress={() => setValue('branche_id', b.id)}
            style={[styles.branche, { backgroundColor: c.surface, borderColor: actif ? c.primary : c.bordure, borderWidth: actif ? 2 : 1 }]}>
            <T gras>{b.nom}</T>
            {b.description ? <Muet v="petit">{b.description}</Muet> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ligneParent(p: ParentBrouillon): string {
  if (p.mode === 'existante') return p.apercu;
  if (p.mode === 'nouvelle') return `${p.prenoms} ${p.nom_famille}`.trim();
  return t('inscription.inconnu');
}

export function EtapeVerification({
  parcours,
  branches,
  allerA,
}: {
  parcours: Parcours;
  branches?: { id: number; nom: string }[];
  allerA: (e: 'identite' | 'branche' | 'pere' | 'mere') => void;
}) {
  const { control, setValue } = useFormContext<Brouillon>();
  const b = useWatch({ control }) as Brouillon;
  const lignes = [
    { e: 'identite' as const, titre: t('inscription.etapes.identite'), valeur: `${b.identite.prenoms} ${b.identite.nom_famille}${b.identite.annee_naissance ? ` · ${b.identite.annee_naissance}` : ''}` },
    { e: 'branche' as const, titre: t('inscription.etapes.branche'), valeur: branches?.find((x) => x.id === b.branche_id)?.nom ?? '' },
    { e: 'pere' as const, titre: t('inscription.etapes.pere'), valeur: ligneParent(b.pere) },
    { e: 'mere' as const, titre: t('inscription.etapes.mere'), valeur: ligneParent(b.mere) },
  ];
  return (
    <View style={styles.pile}>
      <T v="sousTitre">{t('inscription.recapitulatif')}</T>
      {lignes.map((l) => (
        <Carte key={l.e}>
          <Muet v="petit">{l.titre}</Muet>
          <T>{l.valeur}</T>
          <Bouton variante="texte" titre={t('commun.modifier')} onPress={() => allerA(l.e)} />
        </Carte>
      ))}
      <Case coche={b.consentement} onChange={(v) => setValue('consentement', v)}>
        {parcours === 'tiers' ? t('consentement.tiers') : t('consentement.accepter')}
      </Case>
    </View>
  );
}

const styles = StyleSheet.create({
  pile: { gap: espace.m },
  branche: { padding: espace.m, borderRadius: rayon.l, gap: espace.xs },
});
