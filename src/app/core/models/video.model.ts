// Une vidéo du fil « Vidéos » (ce que renvoie /api/videos/). Les noms sont en camelCase, comme le reste de l'API.
export interface VideoEvenement {
  id: string;
  title: string;
  coverImageUrl: string;
  startDate: string;
  venue: string;
}

export interface VideoOrganisateur {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface Video {
  id: string;
  title: string;
  videoUrl: string;          // adresse de lecture (lecture par morceaux côté serveur)
  event: VideoEvenement;
  organizer: VideoOrganisateur;
  viewsCount: number;
  likesCount: number;
  likedByMe: boolean;
  isSponsored: boolean;
  createdAt: string;
  sizeBytes?: number;        // seulement dans « Mes vidéos » (espace organisateur)
}

export interface ReponseJaime {
  liked: boolean;
  likesCount: number;
}
