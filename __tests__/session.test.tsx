import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import * as apiModule from '@/lib/api';
import { SessionFournie, useSession } from '@/lib/auth';

let session: ReturnType<typeof useSession>;

function Sonde() {
  session = useSession();
  return <Text testID="compte">{session.moi?.telephone ?? 'aucun'}</Text>;
}

function Enveloppe({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always' } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it('ouvrir une session sur un autre compte remplace le profil affiché', async () => {
  const profils = ['+2290100000001', '+2290100000002'];
  const appel = jest
    .spyOn(apiModule, 'api')
    .mockImplementation(async (_m: string, chemin: string) => (chemin === '/me' ? { telephone: profils.shift() } : []) as never);

  await render(
    <SessionFournie>
      <Sonde />
    </SessionFournie>,
    { wrapper: Enveloppe }
  );
  await waitFor(() => expect(screen.getByTestId('compte').props.children).toBe('+2290100000001'));

  await act(async () => {
    await session.ouvrir('jeton-du-nouveau-compte');
  });
  await waitFor(() => expect(screen.getByTestId('compte').props.children).toBe('+2290100000002'));
  expect(appel.mock.calls.filter((a) => a[1] === '/me')).toHaveLength(2);
  appel.mockRestore();
});
