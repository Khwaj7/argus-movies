// Displayed by <VersionBadge />. Newest version first; APP_VERSION is the
// badge shown top-right and should match CHANGELOG[0].version.
export const APP_VERSION = '5.0'

export type ChangelogEntry = {
  version: string
  title: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '5.0',
    title: 'Confort & thèmes',
    date: '2026-07-20',
    changes: [
      'Anti-doublons : alerte si le film est déjà dans la liste',
      'Swipe de droite à gauche sur mobile pour marquer un film comme vu',
      '« Tout sélectionner » dans le choix « Vu par… »',
      'Thèmes du film affichés en étiquettes colorées sur chaque carte',
      'Notifications personnelles (non partagées), en bas à droite',
    ],
  },
  {
    version: '4.0',
    title: 'Profils & activité',
    date: '2026-07-19',
    changes: [
      'Profils : indiquez qui a vu chaque film (« Vu par… »)',
      'Onglets « À voir » / « Vus » personnalisés selon votre profil',
      'Notifications en temps réel : film ajouté, profil rejoint, film vu',
      'Numéro de version en haut à droite, avec ce changelog',
    ],
  },
  {
    version: '3.0',
    title: 'Iris',
    date: '2026-07-19',
    changes: [
      "Renommage de l'application « Argus » en « Iris »",
      'Nouveau logo œil 👁️ et nouvelle icône',
      'Fiche film enrichie',
    ],
  },
  {
    version: '2.0',
    title: 'Détails & filtres',
    date: '2026-07-19',
    changes: [
      'Fiche détaillée du film : synopsis, acteurs et plateformes',
      'Filtrage des films par catégorie',
    ],
  },
  {
    version: '1.0',
    title: 'Recherche & partage',
    date: '2026-07-19',
    changes: [
      'Recherche de films via TMDB',
      'Watchlist partagée en temps réel (Supabase)',
      'Listes « À voir » et « Vus »',
    ],
  },
]
