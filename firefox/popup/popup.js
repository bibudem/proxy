// L'état se lit sur l'icône de la barre d'outils (couleur du U + message au
// survol). La fenêtre n'explique que ce qui empêche d'utiliser l'interrupteur.

const $ = (id) => document.getElementById(id);
const inter = $("interrupteur");

let etatCourant = "chargement";
let occupe = false;
const estActif = (e) => e === "actif";

function afficher(etat) {
  etatCourant = etat;
  $("etat").hidden = etat !== "permission";
  $("note-conflit").hidden = etat !== "conflit";
  $("note-erreur").hidden = etat !== "erreur";

  inter.setAttribute("aria-checked", String(estActif(etat)));
  inter.setAttribute("aria-busy", String(occupe));
  // aria-disabled plutôt que disabled : le focus clavier reste sur l'interrupteur.
  const bloque = occupe || ["chargement", "permission", "conflit"].includes(etat);
  inter.setAttribute("aria-disabled", String(bloque));
}

inter.addEventListener("click", async () => {
  if (inter.getAttribute("aria-disabled") === "true") return;
  const activer = !estActif(etatCourant);
  occupe = true;
  afficher(etatCourant);
  inter.setAttribute("aria-checked", String(activer)); // retour visuel immédiat
  let etat = "erreur";
  try {
    etat = await browser.runtime.sendMessage({ type: "basculer", activer });
  } catch (e) {
    console.error(e);
  }
  occupe = false;
  afficher(etat);
});

(async () => {
  afficher("chargement");
  try {
    afficher(await browser.runtime.sendMessage({ type: "etat" }));
  } catch (e) {
    console.error(e);
    afficher("erreur");
  }
})();
