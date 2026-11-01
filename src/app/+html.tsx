import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const SANS_BARRES = '*{scrollbar-width:none}*::-webkit-scrollbar{display:none}';

export default function Racine({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#1F6B4F" />
        <link rel="manifest" href="manifest.json" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: SANS_BARRES }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
