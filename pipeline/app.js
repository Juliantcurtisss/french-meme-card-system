const $ = id => document.getElementById(id);
const rarities = ['common','uncommon','rare','legendary','mistic','full art','shiny'];
const descriptions = ['Cadre jaune, illustration mate, une étoile.', 'Cadre jaune, reflet holographique sur l’illustration.', 'Cadre argent, reflets violets sur toute la carte.', 'Cadre or, fond doré et éclats lumineux.', 'Cadre émeraude, violet nuit et poussière d’étoiles.', 'Image bord à bord, texte blanc et texture gravée.', 'Image bord à bord, cadre arc-en-ciel et paillettes.'];
const swatches = ['#d3c7ad','#a0afbe','#aa83d5','#edbf38','#5ee7b5','#ddd','#ef86d8'];
let image = '', rarity = 'common', token, timer, generation = 0, uploadGeneration = 0, ready = false, uploading = false, saving = false;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function addAttack(value = {}) {
  if ($('attacks').children.length >= 3) return;
  const row = document.createElement('div'); row.className = 'attack';
  row.innerHTML = '<div class="attack-top"><input class="attack-name" maxlength="36" placeholder="Nom de l’attaque" aria-label="Nom de l’attaque" required><input class="attack-dmg" type="number" min="0" max="300" step="1" placeholder="Auto" aria-label="Dégâts, vide pour automatique"><button class="remove" type="button" aria-label="Supprimer cette attaque">×</button></div><textarea class="attack-text" maxlength="140" placeholder="Effet de l’attaque (facultatif)" aria-label="Effet de l’attaque"></textarea>';
  row.querySelector('.attack-name').value = value.name || '';
  row.querySelector('.attack-dmg').value = value.dmg ?? '';
  row.querySelector('.attack-text').value = value.text || '';
  row.querySelector('.remove').onclick = () => { row.remove(); if (!$('attacks').children.length) addAttack(); $('add-attack').disabled = false; schedule(); };
  $('attacks').append(row); $('add-attack').disabled = $('attacks').children.length >= 3;
}
function selectRarity(value) {
  rarity = value;
  for (const button of $('rarities').children) button.setAttribute('aria-pressed', String(button.dataset.rarity === value));
  const index = rarities.indexOf(value); $('rarity-description').textContent = descriptions[index];
  $('preview-tier').textContent = `${value.toUpperCase()} · ${'★'.repeat(index + 1)}`;
}
function payload() {
  return {name:$('name').value.trim(), image, rarity,
    attacks: [...$('attacks').children].map(row => ({name:row.querySelector('.attack-name').value.trim(), dmg:row.querySelector('.attack-dmg').value, text:row.querySelector('.attack-text').value.trim()}))};
}
function valid(data) { return !uploading && data.name && data.image && data.attacks.length && data.attacks.every(a => a.name); }
async function api(endpoint, data) {
  const response = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/json','X-Card-Token':token}, body:JSON.stringify(data)});
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Échec de la requête.'); return result;
}
function schedule() {
  clearTimeout(timer); generation++; ready = false; $('save').disabled = true;
  timer = setTimeout(render, 250);
}
async function render() {
  const current = generation, data = payload();
  if (!valid(data)) { $('preview').hidden = true; $('empty').hidden = false; $('preview-name').textContent = 'Complétez votre carte'; return; }
  if (!token) return;
  status('Création de l’aperçu…');
  try {
    const result = await api('/api/render',data);
    if (current !== generation) return;
    $('preview').srcdoc = result.html;
    $('empty').hidden = true; $('preview').hidden = false;
    $('preview-name').textContent = result.card.name;
    ready = true; $('save').disabled = saving;
    status('Aperçu prêt. Les détails manquants sont générés automatiquement.');
  } catch(error) { if (current === generation) status(error.message,true); }
}
async function setImage(file) {
  if (!file) return;
  const version = ++uploadGeneration; generation++;
  uploading = true; image = ''; ready = false; $('save').disabled = true;
  try {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choisissez un JPG, PNG ou WebP de moins de 8 Mo.');
    const url = await new Promise((resolve,reject) => { const r = new FileReader(); r.onload=() => resolve(r.result); r.onerror=() => reject(new Error('Image illisible.')); r.readAsDataURL(file); });
    const test = new Image(); test.src = url; await test.decode();
    if (version !== uploadGeneration) return;
    image = url; $('upload-thumb').src = url; $('upload-thumb').hidden = false;
    $('upload-label').textContent = file.name; $('dropzone').querySelector('.upload-icon').hidden = true;
  } catch(error) { if (version === uploadGeneration) status(error.message,true); }
  finally { if (version === uploadGeneration) { uploading = false; schedule(); } }
}
async function listResults() {
  const response = await fetch('/api/results'); const {files} = await response.json(); $('results').replaceChildren();
  if (!files.length) { const li = document.createElement('li'); li.textContent = 'Votre première création vous attend.'; li.className='hint'; $('results').append(li); }
  for (const file of files) {
    const li = document.createElement('li'), link = document.createElement('a'), json = document.createElement('a');
    link.href='/results/'+encodeURIComponent(file); link.target='_blank'; link.rel='noopener';
    link.textContent=file.replace(/-\d{4}-\d{2}-\d{2}T.*$/,'').replace(/-/g,' ');
    json.href=link.href.replace(/\.html$/,'.json'); json.download=file.replace(/\.html$/,'.json'); json.textContent='JSON ↓';
    li.append(link,json); $('results').append(li);
  }
}
$('image').onchange = event => setImage(event.target.files[0]);
$('dropzone').ondragover = event => { event.preventDefault(); $('dropzone').classList.add('drag'); };
$('dropzone').ondragleave = () => $('dropzone').classList.remove('drag');
$('dropzone').ondrop = event => { event.preventDefault(); $('dropzone').classList.remove('drag'); setImage(event.dataTransfer.files[0]); };
$('add-attack').onclick = () => { addAttack(); schedule(); };
$('creator').addEventListener('input', event => { if (event.target.type !== 'file') schedule(); });
$('creator').onsubmit = async event => {
  event.preventDefault(); if (!ready || saving) return;
  saving = true; $('save').disabled = true; status('Enregistrement dans results…');
  try {
    const result = await api('/api/save',payload()); await listResults();
    status('Carte enregistrée : ' + decodeURIComponent(result.html).replace('/results/','results/'));
  } catch(error) { status(error.message,true); }
  finally { saving = false; $('save').disabled = !ready; }
};
$('example').onclick = async () => {
  try {
    const response = await fetch('/assets/macron-enhanced.png'); if (!response.ok) throw new Error('Asset Macron introuvable.');
    await setImage(new File([await response.blob()],'macron-enhanced.png',{type:'image/png'}));
    $('name').value = 'Macron !'; $('attacks').replaceChildren();
    addAttack({name:'Macron, explosion !'}); addAttack({name:'Putainnn'}); selectRarity('common'); schedule();
  } catch(error) { status(error.message,true); }
};
$('import').onchange = async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 13_000_000) throw new Error('JSON trop volumineux.');
    const card = JSON.parse(await file.text());
    if (!card.image?.startsWith('data:image/') || !Array.isArray(card.attacks) || !card.attacks.length || card.attacks.length > 3 || !rarities.includes(card.rarityLabel)) throw new Error('Choisissez un JSON exporté par cet atelier.');
    const img = new Image(); img.src=card.image; await img.decode();
    image=card.image; $('name').value=card.name; $('upload-thumb').src=image; $('upload-thumb').hidden=false; $('upload-label').textContent='Image de la carte importée';
    $('dropzone').querySelector('.upload-icon').hidden=true; $('attacks').replaceChildren(); card.attacks.forEach(addAttack); selectRarity(card.rarityLabel); schedule();
    status('Nom, image et attaques importés. Les autres détails seront régénérés.');
  } catch(error) { status(error.message,true); }
};
for (let index=0;index<rarities.length;index++) {
  const button=document.createElement('button'); button.type='button'; button.className='rarity'; button.dataset.rarity=rarities[index];
  button.style.setProperty('--swatch',swatches[index]); const dot=document.createElement('i'); dot.setAttribute('aria-hidden','true'); button.append(dot,rarities[index]);
  button.onclick=() => { selectRarity(rarities[index]); schedule(); }; $('rarities').append(button);
}
addAttack(); selectRarity('common');
fetch('/api/config').then(r=>r.json()).then(config=>{token=config.token; schedule();}).catch(()=>status('Démarrez le créateur avec Start Card Creator.command.',true));
listResults().catch(()=>{});
