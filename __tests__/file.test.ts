import AsyncStorage from '@react-native-async-storage/async-storage';

import { ErreurApi } from '@/lib/api';
import { ajouterEnvoi, lireFile, viderFile } from '@/lib/file';

const envoi = (id: string) => ({ client_uuid: id, chemin: '/inscriptions', corps: { id }, cree_le: 1 });

beforeEach(() => AsyncStorage.clear());

describe('file d\'envoi hors ligne', () => {
  it('rejoue et vide la file au retour du réseau', async () => {
    await ajouterEnvoi(envoi('a'));
    await ajouterEnvoi(envoi('b'));
    const poster = jest.fn(async () => ({ personne_id: 1 }));
    const issues = await viderFile(poster);
    expect(poster).toHaveBeenCalledTimes(2);
    expect(issues.map((i) => i.type)).toEqual(['reussi', 'reussi']);
    expect(await lireFile()).toEqual([]);
  });

  it('garde les envois tant que le réseau est coupé', async () => {
    await ajouterEnvoi(envoi('a'));
    await ajouterEnvoi(envoi('b'));
    const poster = jest.fn(async () => {
      throw new ErreurApi(0, 'reseau', 'coupure');
    });
    expect(await viderFile(poster)).toEqual([]);
    expect(poster).toHaveBeenCalledTimes(1);
    expect(await lireFile()).toHaveLength(2);
  });

  it('garde les envois sur une erreur serveur', async () => {
    await ajouterEnvoi(envoi('a'));
    await viderFile(async () => {
      throw new ErreurApi(503, 'x', 'indisponible');
    });
    expect(await lireFile()).toHaveLength(1);
  });

  it('remonte un refus 409 sans bloquer les envois suivants', async () => {
    await ajouterEnvoi(envoi('a'));
    await ajouterEnvoi(envoi('b'));
    const poster = jest
      .fn()
      .mockRejectedValueOnce(new ErreurApi(409, 'rapprochement_requis', 'choisir'))
      .mockResolvedValueOnce({});
    const issues = await viderFile(poster);
    expect(issues.map((i) => i.type)).toEqual(['refuse', 'reussi']);
    expect(await lireFile()).toEqual([]);
  });

  it('un même uuid ajouté deux fois ne fait qu\'un envoi', async () => {
    await ajouterEnvoi(envoi('a'));
    await ajouterEnvoi(envoi('a'));
    expect(await lireFile()).toHaveLength(1);
  });
});
