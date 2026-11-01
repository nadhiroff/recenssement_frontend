import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { Parcours } from '@/features/inscription/Parcours';
import { brouillonVide, construireCorps, lireBrouillon } from '@/features/inscription/modele';
import { ErreurApi } from '@/lib/api';
import * as apiModule from '@/lib/api';
import { lireFile } from '@/lib/file';
import { ReseauFourni } from '@/lib/reseau';
import { ThemeFourni } from '@/theme';

jest.mock('@/lib/auth', () => ({
  useSession: () => ({ recharger: jest.fn(), moi: { branches_relais: [], branches_referent: [], role: 'membre' } }),
}));

const BRANCHES = [{ id: 1, nom: 'Branche Houngbo', description: null }];
const KOSSI = {
  personne: { id: 9, nom_complet: 'Kossi ZOCLI', noms: [], sexe: 'M', annee_naissance: 1968, precision_naissance: 'environ' },
  score: 70,
  filiation: 'Mawuli ZOCLI',
};

let appel: jest.SpyInstance;
let reseauCoupe = false;

function reponseApi(methode: string, chemin: string) {
  if (chemin === '/branches') return BRANCHES;
  if (chemin === '/rapprochement/candidats') return [KOSSI];
  if (chemin.endsWith('/epouses')) {
    return [6, 7].map((id) => ({ union_id: id, rang_epouse: id - 5, personne: { ...KOSSI.personne, id, sexe: 'F', nom_complet: `Épouse ${id}` } }));
  }
  if (methode === 'POST' && chemin === '/inscriptions') {
    if (reseauCoupe) throw new ErreurApi(0, 'reseau', 'coupure');
    return { personne_id: 100 };
  }
  throw new Error(`appel inattendu ${chemin}`);
}

function Enveloppe({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, networkMode: 'always' } } });
  return (
    <QueryClientProvider client={client}>
      <ThemeFourni>
        <ReseauFourni>{children}</ReseauFourni>
      </ThemeFourni>
    </QueryClientProvider>
  );
}

const rendre = () => render(<Parcours parcours="soi" />, { wrapper: Enveloppe });

async function remplirIdentite() {
  await fireEvent.changeText(await screen.findByTestId('prenoms'), 'Afi');
  await fireEvent.changeText(screen.getByTestId('annee'), '1995');
  await fireEvent.press(screen.getByTestId('suivant'));
}

beforeEach(async () => {
  jest.useRealTimers();
  await AsyncStorage.clear();
  reseauCoupe = false;
  (router.replace as jest.Mock).mockClear();
  appel = jest.spyOn(apiModule, 'api').mockImplementation(async (m: string, c: string) => reponseApi(m, c) as never);
});

afterEach(() => appel.mockRestore());

describe('parcours d\'inscription', () => {
  it('refuse d\'avancer sans prénom', async () => {
    await rendre();
    await fireEvent.press(await screen.findByTestId('suivant'));
    expect(await screen.findAllByText('Ce champ est obligatoire.')).not.toHaveLength(0);
    expect(screen.queryByTestId('branche-1')).toBeNull();
  });

  it('conserve le brouillon à chaque champ et le reprend à la réouverture', async () => {
    const { unmount } = await rendre();
    await fireEvent.changeText(await screen.findByTestId('prenoms'), 'Afi');
    await waitFor(async () => expect((await lireBrouillon('soi'))?.identite.prenoms).toBe('Afi'));
    await unmount();
    await rendre();
    expect((await screen.findByTestId('prenoms')).props.value).toBe('Afi');
  });

  it('propose la fiche existante, propose les deux épouses, puis envoie', async () => {
    await rendre();
    await remplirIdentite();
    await fireEvent.press(await screen.findByTestId('branche-1'));
    await fireEvent.press(screen.getByTestId('suivant'));

    await fireEvent.changeText(await screen.findByTestId('pere-prenoms'), 'Kossi');
    await fireEvent.press(await screen.findByTestId('choisir-9', {}, { timeout: 2000 }));
    expect(await screen.findByTestId('fiche-choisie')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('suivant'));

    expect(await screen.findByText('Épouse 6')).toBeTruthy();
    expect(screen.getByText('Épouse 7')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('choisir-7'));
    await fireEvent.press(screen.getByTestId('suivant'));

    await fireEvent.press(await screen.findByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('envoyer'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/liens'));
    expect(await lireFile()).toEqual([]);
    const corps = appel.mock.calls.find((a) => a[1] === '/inscriptions')?.[2] as Record<string, unknown>;
    expect(corps.pere).toEqual({ personne_id: 9 });
    expect(corps.mere).toEqual({ personne_id: 7 });
    expect(await lireBrouillon('soi')).toBeNull();
  });

  it('met l\'envoi en file si le réseau coupe, et garde le brouillon', async () => {
    reseauCoupe = true;
    const b = { ...brouillonVide(), etape: 4, branche_id: 1, consentement: true };
    b.identite.prenoms = 'Afi';
    await AsyncStorage.setItem('brouillon.soi', JSON.stringify(b));
    await rendre();
    await fireEvent.press(await screen.findByTestId('envoyer'));
    expect(await screen.findByText(/partira toute seule/)).toBeTruthy();
    const file = await lireFile();
    expect(file).toHaveLength(1);
    expect(file[0].client_uuid).toBe(b.client_uuid);
    expect(router.replace).not.toHaveBeenCalled();
    expect((await lireBrouillon('soi'))?.identite.prenoms).toBe('Afi');
  });
});

describe('construireCorps', () => {
  it('n\'envoie pas les champs internes et traite l\'année vide', () => {
    const b = brouillonVide();
    b.identite.prenoms = ' Afi ';
    b.pere = { ...b.pere, mode: 'inconnu' };
    b.mere = { ...b.mere, mode: 'nouvelle', nom_famille: 'AHO', prenoms: 'Nadège', rapprochement_vu: true };
    const corps = construireCorps(b, 'soi') as { identite: Record<string, unknown>; pere: unknown; mere: { nouvelle: Record<string, unknown> } };
    expect(corps.identite.prenoms).toBe('Afi');
    expect(corps.identite.precision_naissance).toBe('inconnue');
    expect(corps.pere).toBeUndefined();
    expect(corps.mere.nouvelle.rapprochement_vu).toBe(true);
  });
});
