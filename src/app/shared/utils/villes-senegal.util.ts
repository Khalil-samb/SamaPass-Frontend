import { City } from '../../core/models';

// Coordonnées (latitude, longitude) des principales villes du Sénégal, repérées par leur nom sans accent.
const COORDONNEES: Record<string, [number, number]> = {
  dakar: [14.7167, -17.4677],
  pikine: [14.7549, -17.3985],
  guediawaye: [14.7692, -17.3939],
  rufisque: [14.7167, -17.2667],
  diamniadio: [14.7195, -17.1809],
  thies: [14.791, -16.9359],
  mbour: [14.4198, -16.9648],
  saly: [13.95, -16.7667],
  popenguine: [14.5, -17.1],
  'saint louis': [16.0179, -16.4896],
  louga: [15.6144, -16.2246],
  touba: [14.85, -15.8833],
  diourbel: [14.6556, -16.2314],
  kaolack: [14.15, -16.0726],
  fatick: [14.339, -16.4111],
  kaffrine: [14.1052, -15.5508],
  tambacounda: [13.7707, -13.6673],
  kedougou: [12.5605, -12.1747],
  matam: [15.6559, -13.2554],
  kolda: [12.8939, -14.9406],
  sedhiou: [12.708, -15.5569],
  ziguinchor: [12.5833, -16.2719],
  'cap skirring': [12.3922, -16.7458],
};

function normaliser(texte: string): string {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// La ville de notre liste la plus proche de la position, ou null si aucune n'est à moins de distanceMaxKm.
export function villeLaPlusProche(lat: number, lng: number, villes: City[], distanceMaxKm = 100): City | null {
  let meilleure: City | null = null;
  let plusPetite = Infinity;
  for (const ville of villes) {
    const nom = normaliser(ville.name);
    const coord = COORDONNEES[nom] ?? Object.entries(COORDONNEES).find(([cle]) => nom.startsWith(cle))?.[1];
    if (!coord) continue;
    const d = distanceKm(lat, lng, coord[0], coord[1]);
    if (d < plusPetite) {
      plusPetite = d;
      meilleure = ville;
    }
  }
  return meilleure && plusPetite <= distanceMaxKm ? meilleure : null;
}
