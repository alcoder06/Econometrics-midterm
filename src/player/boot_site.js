/* Public site: load the published packs listed in packs/index.json. */
(async function () {
  const view = document.getElementById("view");
  const fail = msg => { view.innerHTML = `<div class="card empty"><b>Couldn't load the study packs.</b><span class="small">${msg}</span></div>`; };
  let packs;
  try {
    const r = await fetch("packs/index.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    packs = (await r.json()).packs || [];
  } catch (e) {
    return fail(location.protocol === "file:" ? "This page loads its packs over the web. Open the live site, or run <code>python -m http.server</code> in this folder and visit localhost:8000." : "Check your connection and reload the page.");
  }
  if (!packs.length) return fail("No subjects have been published yet.");
  const loadPack = async id => {
    const entry = packs.find(p => p.id === id); if (!entry) throw new Error("unknown pack");
    const r = await fetch("packs/" + encodeURIComponent(entry.file), { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  };
  let last = "";
  try { last = (JSON.parse(localStorage.getItem("econprep.settings.v1") || "{}").lastPack) || ""; } catch (e) { }
  // Direct links: #pack-<id> opens that subject; #pack-<id>~learn-s2 also opens a page inside it.
  const deep = location.hash.match(/^#pack-([a-z0-9-]+)(?:~([a-z0-9-]+))?$/i);
  const wanted = deep && packs.find(p => p.id === deep[1].toLowerCase());
  const first = wanted || packs.find(p => p.id === last) || packs[0];
  try {
    if (deep) history.replaceState(null, "", "#" + (deep[2] || "home"));
    StudyPlayer.start(await loadPack(first.id), { packs, loadPack, allowFile: true });
    if (packs.length > 1 && !last && !wanted) location.hash = "#packs";
  } catch (e) { fail("Check your connection and reload the page."); }
})();
