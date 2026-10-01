# Playdex

Ta bibliothèque Steam en Pokédex. Chaque jeu numéroté (N° 001 = le plus ancien), chaque heure comptée : temps de jeu, valeur de la collection, jeux jamais lancés, succès, séries
à compléter, wishlist, amis, historique, et un score transparent pour choisir le prochain jeu.

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Motion · Recharts. Pas de base de données :
tout est mis en cache dans `data/*.json`.

## Démarrer

```bash
npm install
npm run dev
```

Puis <http://localhost:3000> et « Voir la démo » pour tester sans compte (la démo n'a que les jeux).

## Brancher ton compte Steam

1. Clé API gratuite : <https://steamcommunity.com/dev/apikey>
2. Copie `.env.example` en `.env.local`, remplis `STEAM_API_KEY` et `STEAM_ID`
   (SteamID64, pseudo d'URL personnalisée ou URL complète du profil).
3. Dans Steam : Profil → Modifier le profil → Confidentialité : « Détails des jeux » en **Public**
   (et la wishlist / la liste d'amis si tu veux ces onglets).
4. Redémarre `npm run dev`, puis clique « Synchroniser ».

L'appli se resynchronise toute seule à l'ouverture si la dernière synchro a plus de 6 h.
L'onglet ouvert est dans l'URL (`?tab=achievements`…).

### Facultatif : durées pour finir (IGDB)

HowLongToBeat n'a pas d'API publique (et protège sa recherche contre l'automatisation). IGDB, la base de
Twitch, fournit l'équivalent via une API officielle et gratuite : crée une application sur
<https://dev.twitch.tv/console/apps>, puis remplis `IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET` dans `.env.local`.
Le mur de la honte affiche alors le temps pour finir ton backlog, et chaque fiche sa durée.

## Ce que fait une synchro

| Étape | Source | Coût |
|---|---|---|
| Jeux, profil, wishlist | Steam Web API | 3 appels |
| Fiches Store (prix, tags, avis, images) | `IStoreBrowseService/GetItems`, lots de 200 | ~5 appels |
| Photo des temps de jeu | local (`data/history.json`) | – |
| Succès | `GetPlayerAchievements` + schéma + % mondiaux | 1ʳᵉ fois ~1 min, ensuite seulement les jeux rejoués |
| Amis | `GetFriendList` + bibliothèques publiques | ~30 appels |
| Séries | recherche Store sur chaque série | 60 séries max par synchro, cache 30 jours |
| Durées | IGDB (si configuré) | nouveaux jeux seulement |

Chaque étape après les fiches Store est facultative : si elle échoue, la synchro continue et le signale.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/lib/steam.ts` | Client Steam Web API + Store (côté serveur, la clé ne sort jamais) |
| `src/lib/sync.ts` | Orchestration de la synchro, en générateur de progression |
| `src/lib/history.ts` | Photos différentielles des temps de jeu → heures par semaine, revenants |
| `src/lib/achievements.ts` | Succès : synchro incrémentale, raretés, presque-100 %, activité passée |
| `src/lib/social.ts` | Amis : en ce moment, jeux multi en commun, compatibilité |
| `src/lib/collection.ts` | Séries à compléter et studios favoris |
| `src/lib/igdb.ts` | Durées pour finir |
| `src/lib/profile.ts` | Traits de joueur (règles explicites) |
| `src/lib/analytics.ts` | Calculs partagés (Pareto, tags, recommandations, coût par heure) |
| `src/lib/data.ts` | Assemble tout pour la page, côté serveur |
| `src/app/api/sync` | Lance la synchro, renvoie la progression en flux NDJSON |
| `src/app/api/card` | Carte de profil PNG (1200 × 630) |
| `src/components/` | L'interface (un fichier par onglet) |

## Les scores, sans boîte noire

**Quoi jouer ensuite**
- **Préférence pour un tag** = part de ton temps sur ce tag ÷ part de ta bibliothèque qui l'a
  (tags présents sur au moins 3 jeux). 1 = neutre ; ramenée sur 0–100 en échelle log (4× → 100, ÷4 → 0).
- **Affinité d'un jeu** = moyenne des préférences de ses tags.
- **Qualité** = % d'évaluations positives Steam, après ajout de 200 avis fictifs à 70 % (moyenne bayésienne).
- **Score** = poids × affinité + (1 − poids) × qualité, le poids se règle avec le curseur.

**Wishlist** : score d'achat = 40 % affinité + 30 % qualité + 30 % remise. « Plus bas récent » = en promo
et au plus bas prix récent connu de Steam.

**Amis** : compatibilité = jeux joués par vous deux ÷ jeux joués par au moins l'un de vous (Jaccard).

**Historique** : entre deux synchros, les minutes gagnées sont réparties uniformément sur les jours de
l'intervalle. La toute première photo est reconstituée 14 jours plus tôt grâce au temps de jeu des
2 dernières semaines fourni par Steam.

**Profil** : chaque trait est une règle avec son seuil, affichée à côté (voir `src/lib/profile.ts`).

Les tags de mode de jeu ou de contenu (« Jeu solo », « Multijoueur », « 3ᵉ personne »…) sont ignorés :
voir `NOISE_TAGS` dans `src/lib/steam.ts`.

## Limites connues

- Steam ne donne pas le prix payé : la valeur et le coût par heure utilisent le prix plein actuel.
- Les jeux retirés du Store n'ont ni prix ni tags.
- Les séries sont retrouvées par recherche sur leur nom : des jeux peuvent manquer.
- L'intégration IGDB n'a pas pu être testée sans identifiants : en cas de souci, la synchro le signale
  sans échouer.

## Données et vie privée

Tout reste sur ta machine : la clé API est lue côté serveur depuis `.env.local`, et les données
synchronisées vont dans `data/`. Ces deux emplacements sont exclus du dépôt git.

Projet non affilié à Valve ni à Steam. Les images et données des jeux viennent des API publiques de Steam.

## Licence

MIT, voir [LICENSE](LICENSE).
