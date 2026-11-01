import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Ecran } from '@/components/Ecran';
import { Badge, Bouton, Carte, Champ, Choix, Erreur, Muet, Squelette, T } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import type { Branche, Lien } from '@/lib/types';
import { vibrerSucces } from '@/lib/retour';
import type { StatutLien } from '@/theme/tokens';

// Reflet de l'interface : la machine à états fait foi côté serveur.
const ACTIONS: Record<StatutLien, ('valider' | 'examen' | 'prive' | 'rejeter')[]> = {
  declare: ['examen', 'prive', 'rejeter'],
  confirme: ['valider', 'examen', 'prive', 'rejeter'],
  en_examen: ['valider', 'prive', 'rejeter'],
  prive: ['examen', 'rejeter'],
  valide: ['examen', 'prive', 'rejeter'],
  rejete: [],
};

export default function DetailLien() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const lien = useQuery({ queryKey: ['lien', id], queryFn: () => api<Lien>('GET', `/liens/${id}`) });
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api<Branche[]>('GET', '/branches'), staleTime: 3600_000 });
  const [motif, setMotif] = useState('');
  const [erreurMotif, setErreurMotif] = useState<string>();
  const [branche, setBranche] = useState<string | null>(null);

  const decider = useMutation({
    mutationFn: (action: string) => api('POST', `/liens/${id}/${action}`, { motif }),
    onSuccess: () => {
      vibrerSucces();
      client.invalidateQueries({ queryKey: ['file'] });
      router.back();
    },
  });
  const rattacher = useMutation({
    mutationFn: () => api('POST', `/personnes/${lien.data?.enfant?.id}/branche`, { branche_id: Number(branche) }),
    onSuccess: () => {
      vibrerSucces();
      client.invalidateQueries({ queryKey: ['lien', id] });
      client.invalidateQueries({ queryKey: ['file'] });
    },
  });
  const agir = (action: 'valider' | 'examen' | 'prive' | 'rejeter') => {
    if ((action === 'prive' || action === 'rejeter') && motif.trim() === '') {
      setErreurMotif(t('referent.motifObligatoire'));
      return;
    }
    setErreurMotif(undefined);
    decider.mutate(action);
  };

  const l = lien.data;
  if (!l) {
    return (
      <Ecran>
        {lien.isPending ? <Squelette hauteur={200} /> : <Erreur>{lien.error?.message}</Erreur>}
        <Bouton variante="texte" titre={t('commun.retour')} onPress={() => router.back()} />
      </Ecran>
    );
  }
  const actions = ACTIONS[l.statut];
  return (
    <Ecran>
      <T v="titre">{t('liens.entre', { parent: l.parent?.nom_complet ?? '', role: t(`roles.${l.role_parent}`), enfant: l.enfant?.nom_complet ?? '' })}</T>
      <Carte>
        <Badge statut={l.statut} />
        {l.declarant ? <Muet>{t('referent.declarant', { nom: l.declarant })}</Muet> : null}
        {l.enfant?.telephone_whatsapp ? <Muet>{t('referent.telephone', { tel: l.enfant.telephone_whatsapp })}</Muet> : null}
        {l.motif_prive ? <T>{t('liens.motif', { motif: l.motif_prive })}</T> : null}
        {l.motif_rejet ? <T>{t('liens.motif', { motif: l.motif_rejet })}</T> : null}
      </Carte>
      {l.invitations?.length ? (
        <Carte>
          <T gras>{t('referent.invitations')}</T>
          {l.invitations.map((i) => (
            <Muet key={i.created_at} v="petit">
              {i.created_at.slice(0, 10)} : {i.reponse ? t(`referent.reponses.${i.reponse}`) : i.utilise_le ? t('confirmation.nsp') : t('referent.sansReponse')}
            </Muet>
          ))}
        </Carte>
      ) : null}
      {l.conflit ? (
        <Carte>
          <T gras>{t('referent.autreReferentLong')}</T>
        </Carte>
      ) : (
        <>
          {actions.some((a) => a === 'prive' || a === 'rejeter') ? (
            <Champ label={t('referent.motifPrive')} value={motif} onChangeText={setMotif} erreur={erreurMotif} multiline />
          ) : null}
          {actions.map((a) => (
            <Bouton
              key={a}
              variante={a === 'valider' ? 'plein' : a === 'rejeter' ? 'danger' : 'contour'}
              titre={t(`referent.${a}`)}
              chargement={decider.isPending && decider.variables === a}
              onPress={() => agir(a)}
            />
          ))}
          <Erreur>{decider.error?.message}</Erreur>
          <Choix
            label={t('referent.rattacher')}
            valeur={branche}
            onChange={setBranche}
            options={(branches.data ?? []).map((b) => ({ valeur: String(b.id), libelle: b.nom }))}
          />
          {branche ? <Bouton variante="contour" titre={t('commun.enregistrer')} chargement={rattacher.isPending} onPress={() => rattacher.mutate()} /> : null}
          <Erreur>{rattacher.error?.message}</Erreur>
          {rattacher.isSuccess ? <Muet>{t('referent.rattache')}</Muet> : null}
        </>
      )}
      <Carte>
        <T gras>{t('referent.historique')}</T>
        {l.historique?.map((h, i) => (
          <Muet key={i} v="petit">
            {h.cree_le.slice(0, 16)} · {h.action}
          </Muet>
        ))}
      </Carte>
      <Bouton variante="texte" titre={t('commun.retour')} onPress={() => router.back()} />
    </Ecran>
  );
}
