// Export web complet : liste de pré-cache pour le service worker, puis copie vers le backend.
import { cpSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const cible = process.argv[2] ?? '/var/www/html/recenssement_famille-Backend/app';
execSync('npx expo export --platform web --output-dir dist', { stdio: 'inherit' });

const lister = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? lister(p) : [p];
  });
const fichiers = lister('dist').filter((f) => /\.(js|css|html|png|ico|json)$/.test(f) && !f.endsWith('metadata.json') && !f.includes('react-navigation'));
const empreinte = createHash('sha256').update(fichiers.map((f) => readFileSync(f)).join('')).digest('hex').slice(0, 12);
writeFileSync('dist/precache.json', JSON.stringify({ version: empreinte, fichiers: fichiers.map((f) => relative('dist', f)) }));

// Expo n'écrit que son favicon dans index.html : le logo SVG passe devant, relatif au dossier de la PWA.
const page = readFileSync('dist/index.html', 'utf8');
if (!page.includes('logo.svg')) {
  writeFileSync('dist/index.html', page.replace('</head>', `<link rel="icon" type="image/svg+xml" href="${page.match(/src="([^"]*)\/_expo/)?.[1] ?? '.'}/logo.svg" /></head>`));
}

rmSync(cible, { recursive: true, force: true });
cpSync('dist', cible, { recursive: true });
console.log(`PWA copiée vers ${cible} (${fichiers.length} fichiers, version ${empreinte})`);
