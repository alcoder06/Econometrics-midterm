/* Claude artifact: packs are embedded in the page (its network is sandboxed); progress syncs via the db capability. */
(function () {
  const packs = EMBEDDED_PACKS.map(p => ({ id: p.id, title: p.title, subtitle: p.subtitle, subject: p.subject, questions: p.questions.length, sections: p.sections.length, updated: p.updated }));
  const loadPack = async id => EMBEDDED_PACKS.find(p => p.id === id);
  let last = "";
  try { last = (JSON.parse(localStorage.getItem("econprep.settings.v1") || "{}").lastPack) || ""; } catch (e) { }
  const first = EMBEDDED_PACKS.find(p => p.id === last) || EMBEDDED_PACKS[0];
  StudyPlayer.start(first, { packs, loadPack, remote: true, allowFile: false });
})();
