/** Même règle que le serveur : Bénin en +22901 + 8 chiffres, ancien numéro à 8 chiffres complété. */
export function normaliserTelephone(saisie: string): string {
  const net = saisie.replace(/[\s().-]/g, '');
  return /^\+229\d{8}$/.test(net) ? `+22901${net.slice(4)}` : net;
}

export function telephoneValide(numero: string): boolean {
  if (numero.startsWith('+229')) return /^\+22901\d{8}$/.test(numero);
  return /^\+[1-9]\d{7,14}$/.test(numero);
}
