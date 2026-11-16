# Proxy des bibliothèques UdeM (Firefox, Chrome, Edge)

![Proxy des bibliothèques : les ressources électroniques des bibliothèques, hors campus, en un clic.](boutiques/chrome/marquee-1400x560.png)

Extension qui active ou désactive en un clic le proxy des Bibliothèques de l’Université de Montréal (script PAC `https://proxy.umontreal.ca`). Le proxy ne s’applique qu’au navigateur : les réglages réseau de l’ordinateur ne sont pas modifiés.

## Installation

| Navigateur | Où l’installer |
| --- | --- |
| Firefox | [Modules complémentaires de Firefox](https://addons.mozilla.org/fr/firefox/addon/proxy-des-biblioth%C3%A8ques-udem/) |
| Google Chrome | [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-des-biblioth%C3%A8ques-u/imiehadnaphbllbkpkjfmkcadcadmmaf) |
| Microsoft Edge | Publication en cours dans la boutique d’Edge. D’ici là, vous pouvez installer la version Chrome depuis le [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-des-biblioth%C3%A8ques-u/imiehadnaphbllbkpkjfmkcadcadmmaf) : Edge propose d’abord d’**Autoriser les extensions d’autres magasins**, puis cliquez sur **Obtenir**. |

## Utilisation

1. Cliquez sur l’icône **U** dans la barre d’outils.
2. Activez l’interrupteur **Utiliser le proxy**.
3. Cliquez sur **Tester mon accès** pour confirmer l’accès sur [testproxy.umontreal.ca](https://testproxy.umontreal.ca).

L’icône indique l’état du proxy, avec un message au survol :

| Icône | État |
| --- | --- |
| U bleu | Proxy activé |
| U gris | Proxy désactivé |
| U gris avec un point rouge | Problème : navigation privée non autorisée (Firefox), proxy contrôlé par une autre extension ou par une politique de l’organisation, ou passerelle qui ne répond pas |


## Installation pour tester

Chaque navigateur a son dossier.

| Dossier | Navigateur | Version minimale | Page des extensions | Quoi charger |
| --- | --- | --- | --- | --- |
| `firefox/` | Firefox | 142 | `about:debugging#/runtime/this-firefox` | **Charger un module complémentaire temporaire…**, puis le fichier `firefox/manifest.json` |
| `chrome/` | Google Chrome | 116 | `chrome://extensions` | Activer le **Mode développeur**, puis **Charger l’extension non empaquetée** et le dossier `chrome/` |
| `edge/` | Microsoft Edge | 116 | `edge://extensions` | Activer le **Mode développeur**, puis **Charger l’extension décompressée** et le dossier `edge/` |

Dans Firefox, l’extension temporaire disparaît à la fermeture du navigateur. Après une modification du code, cliquez sur **Actualiser** sous l’extension.

### Autoriser la navigation privée (Firefox seulement)

Firefox ne permet à une extension de modifier le proxy que si elle est autorisée en navigation privée. Sans cette autorisation, la fenêtre de l’extension affiche les étapes à suivre :

1. Ouvrez le menu **☰** › **Extensions et thèmes**.
2. Cliquez sur **Proxy des bibliothèques UdeM**.
3. À la ligne **Exécution dans les fenêtres privées**, choisissez **Autoriser**.

## Publier une version

Le workflow `.github/workflows/paquets.yml` s’exécute à chaque push sur `main` : il vérifie l’extension et crée les trois paquets. Si l’étiquette `vX.Y.Z` de la version des manifestes n’existe pas encore, il crée l’étiquette et une release GitHub avec les trois paquets. Pour publier, il suffit donc de changer la version :

```sh
scripts/version.sh 1.2.5          # change la version dans les trois manifestes
git commit -am "Version 1.2.5"
git push
```

Le workflow s’arrête si les trois manifestes n’ont pas la même version ou si `web-ext lint` signale un problème. Pour obtenir les paquets sans release, lancez-le à la main (onglet **Actions** › **Paquets** › **Run workflow**).

Il reste à envoyer chaque `.zip` dans sa boutique.

Ne changez jamais l’identifiant `studio@bib.umontreal.ca` du manifeste Firefox : Firefox y verrait une autre extension.

Pour vérifier la version Firefox avant de pousser, depuis la racine du dépôt :

```sh
npx web-ext lint --warnings-as-errors
```

## Fonctionnement

- **Permissions :** `proxy` (modifier le proxy du navigateur) et `alarms` (vérifications périodiques). L’extension ne lit aucune page et ne collecte aucune donnée.
- **Script PAC :** il envoie le trafic d’environ 1 400 sites de fournisseurs vers `proxy-passerelle.bib.umontreal.ca`, qui demande l’identification UdeM. Tout le reste passe en direct.
- **Passerelle :** quand le proxy est activé, l’extension vérifie toutes les 15 minutes qu’elle répond.
- **Liste des sites :** le PAC est régénéré chaque jour. L’extension réapplique le réglage toutes les 24 heures pour que le navigateur recharge la liste.

## Code

Chaque dossier contient les mêmes fichiers :

| Fichier | Rôle |
| --- | --- |
| `manifest.json` | Déclaration de l’extension (Manifest V3) |
| `background.js` | Active ou désactive le script PAC, vérifie la passerelle et met à jour l’icône |
| `popup/` | Fenêtre de l’extension (HTML, CSS, JS, logos, police Figtree et sa licence OFL) |
| `icons/` | Icône U : `on` (bleu), `off` (gris), `erreur` (gris avec un point rouge) |

La fenêtre est la même partout : une modification de `popup/` doit être reportée dans les trois dossiers. Le dossier `edge/` est une copie de `chrome/`, dont seuls les textes mentionnant le navigateur changent. Les différences avec Firefox :

| | Firefox | Chrome et Edge |
| --- | --- | --- |
| Arrière-plan | script d’arrière-plan (`background.scripts`) | service worker |
| API | `browser.proxy`, `proxyType: "autoConfig"` | `chrome.proxy`, `mode: "pac_script"` |
| Icônes de la barre d’outils | SVG | PNG 16 et 32 px |
| Navigation privée | autorisation obligatoire | non requise |

Les captures et images pour les boutiques sont dans `boutiques/`.
