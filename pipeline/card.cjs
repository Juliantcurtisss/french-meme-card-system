const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const tiers = ['common', 'uncommon', 'rare', 'legendary', 'mistic', 'full art', 'shiny'];
const tierKeys = ['common', 'rare', 'epic', 'legendary', 'mistic', 'fullart', 'shiny'];
const types = {
  raleur: ['Râleur', 'chic'], absurde: ['Absurde', 'terroir'], terroir: ['Terroir', 'chic'],
  tele: ['Télé', 'absurde'], chic: ['Chic', 'raleur'], gaulois: ['Gaulois', 'absurde'],
};
function text(value, max, field) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${field}: entrez 1 à ${max} caractères.`);
  return value.trim();
}
function makeCard(input) {
  const name = text(input.name, 32, 'Nom');
  const rarity = input.rarity;
  const level = tiers.indexOf(rarity);
  if (level < 0) throw new Error('Rareté inconnue.');
  const image = input.image;
  if (typeof image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image) || image.length > 12_000_000) throw new Error('Choisissez une image JPG, PNG ou WebP de moins de 8 Mo.');
  if (!Array.isArray(input.attacks) || !input.attacks.length || input.attacks.length > 3) throw new Error('Ajoutez 1 à 3 attaques.');
  const raw = input.attacks.map(a => ({ name: text(a.name, 36, 'Attaque'), text: typeof a.text === 'string' ? a.text.trim() : '', dmg: a.dmg }));
  if (raw.some(a => a.text.length > 140)) throw new Error('Chaque effet est limité à 140 caractères.');
  const words = (name + ' ' + raw.map(a => a.name + ' ' + a.text).join(' ')).toLowerCase();
  const type = /crie|colère|colere|macron|explosion|rage|gueule/.test(words) ? 'raleur'
    : /fromage|pain|vin|vache|terroir/.test(words) ? 'terroir'
    : /télé|tele|émission|emission|koh|antenne/.test(words) ? 'tele'
    : /chic|classe|costume|luxe/.test(words) ? 'chic'
    : /absurde|confus|bizarre|quoi/.test(words) ? 'absurde' : 'gaulois';
  const effects = [
    'Lancez une pièce. Si face, le Défenseur est Confus.',
    'Si ce meme a subi des dégâts au tour précédent, infligez 20 dégâts supplémentaires.',
    'Défaussez une énergie attachée à ce meme après cette attaque.',
  ];
  const attacks = raw.map((a, i) => {
    const dmg = a.dmg === '' || a.dmg == null ? 20 + i * 30 + Math.min(level, 3) * 10 : Number(a.dmg);
    if (!Number.isInteger(dmg) || dmg < 0 || dmg > 300) throw new Error('Les dégâts doivent être un entier entre 0 et 300.');
    return { name: a.name, text: a.text || effects[i], dmg: String(dmg), cost: Array.from({length: Math.min(3, 1 + i)}, (_, j) => j === 0 ? type : 'gaulois') };
  });
  return { id: crypto.randomUUID(), name, tier: tierKeys[level], rarity: '★'.repeat(level + 1), rarityLabel: rarity,
    image, imagePosition: '50% 0%', hp: 70 + Math.min(level, 4) * 20, type, stage: 'De base', category: 'Meme ' + types[type][0], origin: 'Internet',
    attacks, weakness: types[type][1], resistance: null, retreat: level < 3 ? 1 : 2,
    flavor: `« ${name} » : une image suffit, la légende fait le reste.`, number: 'P01/∞', illustrator: 'Image fournie',
    generatedFields: ['hp', 'type', 'stage', 'category', 'origin', 'weakness', 'resistance', 'retreat', 'flavor', 'number', 'attack costs', 'missing damage and effects'] };
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const safeJSON = obj => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const inline = source => '<script>' + source.replace(/<\/script/gi, '<\\/script') + '</script>';
function renderCard(card) {
  let html = read('MemeCard.dc.html');
  html = html.replace(/const DEFAULT = \{[\s\S]*?\n\};\nconst REST/, () => 'const DEFAULT = ' + safeJSON(card) + ';\nconst REST');
  html = html.replace('<script src="./support.js"></script>', () =>
    inline(read('pipeline/vendor/react.min.js')) + inline(read('pipeline/vendor/react-dom.min.js')) + inline('window.__resources = {};') + inline(read('image-slot.js')) + inline(read('support.js')));
  html = html.replace('<script src="./image-slot.js"></script>', '');
  const back = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/card-back-doge.png')).toString('base64');
  html = html.replaceAll('./assets/card-back-doge.png', back);
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><title>' + card.name.replace(/[<>&"']/g, '') + ' · Mèmes de France</title>');
  html = html.replace('</head>', `<style>body{margin:0;background:#1f1b17;min-height:100vh;display:grid;place-items:center}#dc-root{width:380px;height:531px} .sc-host{width:380px;height:531px} @media print{body{background:white}}</style></head>`);
  return html;
}
module.exports = { makeCard, renderCard, tiers, tierKeys };
