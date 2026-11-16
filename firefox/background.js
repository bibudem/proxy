// Proxy des bibliothèques UdeM — bascule le script PAC officiel de l'UdeM
// (https://proxy.umontreal.ca) pour Firefox uniquement, sans toucher
// aux réglages réseau du système. L'interface est dans popup/.

const PAC_URL = "https://proxy.umontreal.ca";

// Serveur vers lequel le script PAC envoie le trafic des fournisseurs
// (« HTTPS proxy-passerelle.bib.umontreal.ca:443 »). Il n'est pas lui-même
// dans la liste du PAC : la requête de vérification part donc en direct.
// Il répond 400 à un GET simple ; seule une erreur réseau compte comme panne.
const PASSERELLE_URL = "https://proxy-passerelle.bib.umontreal.ca/";

const MINUTES_VERIFICATION = 15; // vérification de la passerelle
const MINUTES_RECHARGE_PAC = 24 * 60; // le PAC est régénéré chaque jour

// L'état se lit sur l'icône : couleur du U et message au survol.
const TITRES = {
  actif: "Proxy des bibliothèques : activé",
  inactif: "Proxy des bibliothèques : désactivé",
  permission: "Proxy des bibliothèques : autorisez l’extension en navigation privée",
  conflit: "Proxy des bibliothèques : une autre extension contrôle le proxy",
  injoignable: "Proxy des bibliothèques : le serveur du proxy ne répond pas",
  erreur: "Proxy des bibliothèques : erreur",
};
const ICONES = { actif: "on", inactif: "off" };

// État des réglages, sans requête réseau (rapide, pour la fenêtre).
async function etatReglages() {
  try {
    if (!(await browser.extension.isAllowedIncognitoAccess())) return "permission";
    const { value, levelOfControl } = await browser.proxy.settings.get({});
    // « not_controllable » : proxy imposé par une politique (poste géré).
    if (levelOfControl === "controlled_by_other_extensions" || levelOfControl === "not_controllable") {
      return "conflit";
    }
    const actif =
      levelOfControl === "controlled_by_this_extension" &&
      value.proxyType === "autoConfig" &&
      value.autoConfigUrl === PAC_URL;
    return actif ? "actif" : "inactif";
  } catch (e) {
    console.error(e);
    return "erreur";
  }
}

async function passerelleJoignable() {
  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), 8000);
  try {
    await fetch(PASSERELLE_URL, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(minuterie);
  }
}

async function appliquerIcone(e) {
  await browser.action.setIcon({ path: `icons/${ICONES[e] || "erreur"}.svg` });
  await browser.action.setBadgeText({ text: "" });
  await browser.action.setTitle({ title: TITRES[e] || TITRES.erreur });
}

// Met l'icône à jour : d'abord selon les réglages, puis, si le proxy est
// activé, selon la disponibilité de la passerelle. Le compteur évite qu'une
// vérification lente écrase un état plus récent.
let generation = 0;
async function rafraichir() {
  const moi = ++generation;
  const e = await etatReglages();
  if (moi !== generation) return e; // un rafraîchissement plus récent a pris le relais
  await appliquerIcone(e);
  await planifier(e === "actif");
  if (e === "actif" && !(await passerelleJoignable()) && moi === generation) {
    await appliquerIcone("injoignable");
  }
  return e;
}

async function planifier(actif) {
  if (!actif) {
    await browser.alarms.clearAll();
    return;
  }
  if (!(await browser.alarms.get("verification"))) {
    browser.alarms.create("verification", { periodInMinutes: MINUTES_VERIFICATION });
  }
  if (!(await browser.alarms.get("recharge-pac"))) {
    browser.alarms.create("recharge-pac", { periodInMinutes: MINUTES_RECHARGE_PAC });
  }
}

async function activerPac() {
  await browser.proxy.settings.set({
    value: { proxyType: "autoConfig", autoConfigUrl: PAC_URL, proxyDNS: false },
  });
}

async function basculer(activer) {
  if (activer) await activerPac();
  else await browser.proxy.settings.clear({});
  const e = await etatReglages();
  rafraichir().catch(console.error); // vérification de la passerelle en arrière-plan
  return e;
}

// Firefox ne recharge le PAC qu'au démarrage ou quand le réseau change :
// on réapplique le réglage pour récupérer la liste de sites du jour.
async function rechargerPac() {
  if ((await etatReglages()) !== "actif") return;
  await browser.proxy.settings.clear({});
  try {
    await activerPac();
  } catch (e) {
    console.error(e);
    await activerPac(); // second essai : sinon le proxy resterait désactivé
  }
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "etat") {
    rafraichir().catch(console.error); // l'icône suit, la fenêtre n'attend pas le réseau
    return etatReglages();
  }
  if (msg?.type === "basculer") return basculer(Boolean(msg.activer));
});

browser.alarms.onAlarm.addListener(async ({ name }) => {
  if (name === "recharge-pac") await rechargerPac().catch(console.error);
  await rafraichir();
});

browser.runtime.onStartup.addListener(rafraichir);
browser.runtime.onInstalled.addListener(rafraichir);
rafraichir();
