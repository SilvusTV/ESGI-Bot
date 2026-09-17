# ESGI-Bot

Un noyau (kernel) minimaliste, moderne et extensible pour créer des bots Discord avec TypeScript et discord.js v14.

Le projet intègre désormais le domaine scolaire de l'ancien DSD-GES Bot : gestion dynamique des intervenants (`/intervenant`), des matières (`/matiere`), des devoirs (`/devoir`), mémo des contacts (`/memo`) et rappels hebdomadaires (`/rappeldevoir`). Chaque serveur Discord possède sa propre base SQLite dans `DB/guilds/<id>.db`, sa configuration, ses données scolaires et sa connexion MyGES. Les sélections liées à la base utilisent l'autocomplétion.

Au premier démarrage après la mise à jour, l'ancienne base `DB/bot.db` est copiée vers la base du serveur d'origine. Si le bot est déjà présent sur plusieurs serveurs, renseignez `LEGACY_GUILD_ID` avec l'identifiant Discord de ce serveur avant de démarrer. Conservez une sauvegarde de `DB/bot.db` ; la migration ne modifie pas ce fichier. Chaque serveur doit ensuite utiliser `/gesaccount configurer` pour connecter son propre compte MyGES. Les jetons restent uniquement en mémoire et doivent être renouvelés après un redémarrage.

Le salon du planning se configure avec `/config action:set key:Salon du planning channel:#salon`. Chaque dimanche à 18 h (`Europe/Paris`), le bot y publie le planning de la semaine suivante, avec un embed par journée de cours. Les journées sans cours sont omises. La commande `/planning` publie ou actualise le planning de la semaine en cours dans ce salon.

La création d’une matière peut partir directement d’un cours détecté dans l’agenda avec `/matiere ajouter`. Le professeur correspondant est associé grâce à son `teacher_id` et ajouté localement si nécessaire. Pour un devoir, `/devoir ajouter` propose les prochaines séances de la matière comme échéances, tout en conservant les champs de date et d’heure manuels pour une échéance hors cours.

Ce projet n'est pas un bot « clé en main »: c'est une base solide pensée pour être réutilisée comme fondation d'autres bots. Il fournit la structure, les utilitaires et les conventions nécessaires pour ajouter rapidement vos commandes, événements et composants interactifs (select menus, etc.).

---

## ✨ Points forts

- TypeScript prêt à l'emploi (transpile avec `tsc`, dev avec `ts-node`).
- `discord.js` v14 avec intents essentiels déjà configurés.
- Chargement automatique des commandes, événements et selects (par dossiers).
- Validation minimale des commandes (nom, description, catégorie, etc.).
- Gestion centralisée des erreurs de process (uncaughtException, unhandledRejection…).
- Organisation claire du projet, prête pour la mise en production (dossier `dist`, fichier `ecosystem.config.js` pour PM2).

---

## 📦 Prérequis

- Node.js 18+ recommandé (compatibilité `discord.js` v14).
- Un token de bot Discord (obtenu depuis le [Portail Développeur Discord]).

---

## 🚀 Démarrage rapide

1. Cloner le dépôt
   ```bash
   git clone <votre-fork-ou-repo> discord-bot-kernel
   cd discord-bot-kernel
   ```

2. Installer les dépendances
   ```bash
   npm install
   ```

3. Configurer l'environnement
   - Créez un fichier `.env` à la racine avec au minimum:
     ```env
     DISCORD_TOKEN=VotreTokenDeBotIci
     # Serveur web utilisé pour la connexion MyGES
     WEB_PORT=3000
     WEB_HOST=127.0.0.1
     WEB_PUBLIC_URL=https://bot.example.com
     # Année scolaire utilisée pour l’annuaire MyGES (calculée automatiquement si absente)
     # MYGES_YEAR=2026
     # Optionnel / recommandé
     NODE_ENV=development
     # CLIENT_ID et GUILD_ID sont utiles si vous publiez des commandes slash par guilde
     # CLIENT_ID=123456789012345678
     # GUILD_ID=123456789012345678
     ```

4. Lancer en développement (TypeScript directement)
   ```bash
   npm run dev
   ```

5. Construire et lancer en production
   ```bash
   npm run build
   npm start
   ```

---

## 🗂️ Structure du projet

```
.
├─ commands/                 # Vos commandes (sous‑dossiers par catégorie)
│  └─ <categorie>/
│     └─ maCommande.ts
├─ events/                   # Vos écouteurs d'événements Discord
│  └─ <type>/
│     └─ ready.ts
├─ selects/                  # Vos handlers de SelectMenu
├─ utils/
│  └─ handlers/
│     ├─ CommandUtil.ts      # Chargement/validation des commandes
│     ├─ EventUtil.ts        # Chargement/enregistrement des événements
│     └─ SelectUtil.ts       # Chargement des selects
├─ index.ts                  # Point d'entrée (dev)
├─ dist/                     # Sortie build (JS compilé)
├─ package.json
├─ tsconfig.json
└─ ecosystem.config.js       # PM2 (déploiement/prod)
```

---

## 🧠 ORM (Drizzle + SQLite)

Le kernel inclut une couche ORM légère avec **Drizzle**:

- `utils/db/schema.ts`: mapping des tables SQL -> types TS.
- `utils/db/client.ts`: client SQLite singleton + instance Drizzle.
- `utils/db/repositories/`: repositories (CRUD, requêtes métier, transactions).

Exemple:

```ts
import { ConfigRepository, CONFIG_KEYS } from './utils/db';

const repo = new ConfigRepository();

// Initialise les valeurs par défaut de la configuration globale
repo.ensureDefaults();

// lecture
const prefix = repo.getValue(CONFIG_KEYS.customCommandPrefix) || '!';
```

---

## ⚙️ Scripts NPM

- `npm run dev` — Lancer le bot en développement avec `ts-node`.
- `npm run build` — Compiler TypeScript vers `dist/` avec `tsc`.
- `npm start` — Exécuter la version compilée `dist/index.js`.

---

## 🧩 Ajouter une commande

Placez vos fichiers de commandes dans `commands/<categorie>/<nom>.ts`.

Le loader (`CommandUtil`) valide plusieurs propriétés minimales. Exemple de commande slash:

```ts
// commands/util/ping.ts
import { ChatInputCommandInteraction, ApplicationCommandType, PermissionFlagsBits } from 'discord.js';

export const name = 'ping';
export const description = 'Vérifie la latence du bot.';
export const category = 'util';
export const ownerOnly = false; // bool obligatoire selon le kernel
export const usage = '/ping';
export const examples = ['ping'];
export const defaultMemberPermissions = PermissionFlagsBits.SendMessages; // optionnel
export const type = ApplicationCommandType.ChatInput;

export async function run(interaction: ChatInputCommandInteraction) {
  const msg = await interaction.reply({ content: 'Pong!', fetchReply: true });
  await interaction.editReply(`Pong! Latence: ${Date.now() - (msg as any).createdTimestamp}ms`);
}
```

Contraintes vérifiées par le kernel (warnings si manquant):
- `name`, `description` (sauf pour `ApplicationCommandType.User`), `category`, `ownerOnly`, `usage`, `examples`.

Note: L’enregistrement des commandes slash auprès de Discord (global/guilde) n’est pas inclus par défaut; implémentez votre routine selon vos besoins (REST `Routes.applicationCommands`, etc.).

---

## 🎧 Ajouter un événement

Placez les fichiers dans `events/<type>/<nom>.ts` (le `<type>` est libre — ex: `client`, `guild`, `message`, etc.). Exemple `ready`:

```ts
// events/client/ready.ts
import { Client, Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  console.log(`Connecté en tant que ${client.user?.tag}`);
}
```

`EventUtil` enregistre automatiquement l'événement via `client.on/once` et injecte `client` en premier argument de `execute`.

---

## 🔽 Ajouter un Select Menu handler

Placez vos handlers dans `selects/` (même convention que les commandes) et exposez un identifiant permettant de retrouver le handler côté interaction. Un exemple minimal:

```ts
// selects/example/choose-color.ts
import { StringSelectMenuInteraction } from 'discord.js';

export const name = 'choose-color'; // customId attendu côté composant

export async function run(interaction: StringSelectMenuInteraction) {
  await interaction.reply(`Vous avez choisi: ${interaction.values.join(', ')}`);
}
```

Assurez‑vous de créer vos `StringSelectMenuBuilder` avec `setCustomId('choose-color')` pour relier l’interaction au handler.

---

## 🔐 Variables d’environnement

- `DISCORD_TOKEN` (requis): token du bot pour `client.login()`.
- `NODE_ENV` (optionnel): `development` | `production`.
- `CLIENT_ID`, `GUILD_ID` (optionnel): utiles pour les scripts d’enregistrement de commandes (si vous les ajoutez).
- `WEB_PORT` (optionnel, `3000` par défaut): port du micro-serveur de connexion MyGES.
- `WEB_HOST` (optionnel, `127.0.0.1` par défaut): interface d’écoute. Conservez cette valeur derrière un reverse proxy local.
- `WEB_PUBLIC_URL` (requis pour un accès distant): URL HTTPS publique placée dans les messages privés Discord.
- `MYGES_YEAR` (optionnel): année passée à l’endpoint `/me/{year}/teachers`. Par défaut, le bot utilise l’année de début de l’année scolaire courante.

Le token MyGES est conservé uniquement en mémoire et disparaît à chaque redémarrage. Les identifiants saisis dans le formulaire ne sont jamais écrits en base ou dans les logs. En production, exposez impérativement le formulaire derrière HTTPS (Nginx, Caddy ou un proxy équivalent), puis renseignez cette adresse dans `WEB_PUBLIC_URL`.

---

## 🛠️ Débogage et logs

- Le process gère: `uncaughtException`, `unhandledRejection`, `warning`, `exit` (voir `index.ts`).
- Un utilitaire `Logger` est utilisé par le kernel pour tracer le chargement des commandes (consultez `utils/Logger` si présent dans votre version).

---

## 📦 Déploiement (PM2)

Un `ecosystem.config.js` est fourni pour PM2. Exemple de commandes:

```bash
npm run build
pm2 start ecosystem.config.js --env production
pm2 logs
```

Adaptez le chemin de l'exécutable si nécessaire (par défaut `dist/index.js`).

---

## ❓ Foire aux questions (FAQ)

- Les commandes ne se chargent pas ?
  - Vérifiez l’extension (`.ts` en dev, `.js` en prod dans `dist/`).
  - Respectez les propriétés requises (`name`, `description`, `category`, `ownerOnly`, `usage`, `examples`).
  - Contrôlez le pattern des dossiers: `commands/<categorie>/<fichier>.<ts|js>`.

- Le bot ne démarre pas ?
  - Assurez‑vous d’avoir `DISCORD_TOKEN` dans `.env`.
  - Vérifiez les permissions/intents sur le portail Discord et dans `index.ts`.

---

## 🗺️ Roadmap (suggestions)

- Script d’enregistrement des commandes (global/guilde) via REST Discord.
- Middlewares/guards (permissions, cooldowns, NSFW, etc.).
- Système d’arguments et d’options pour commandes.
- Intégration de tests et CI.

---

## 🤝 Contribution

Les contributions sont les bienvenues. Ouvrez une issue pour discuter d’un changement ou proposez directement une PR claire et ciblée.

---

## 📄 Licence

Ce projet est sous licence ISC (voir `LICENSE`).

---

## 👤 Auteur

Créé par `Silvus_tv` — merci de conserver la mention originale lors des forks si vous réutilisez le kernel.

[Portail Développeur Discord]: https://discord.com/developers/applications
