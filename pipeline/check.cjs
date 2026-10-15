const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {makeCard, renderCard, tiers, tierKeys} = require('./card.cjs');
const root = path.resolve(__dirname,'..');
const image = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root,'assets/macron.JPG')).toString('base64');
const sample = {name:'Macron !', image, rarity:'common', attacks:[{name:'Macron, explosion !',dmg:'20',text:'Le Défenseur est Confus.'},{name:'Putainnn'}]};
const template = fs.readFileSync(path.join(root,'MemeCard.dc.html'),'utf8');
const script = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const Logic = new Function('DCLogic','React',script+';return Component;')(class {constructor(props){this.props=props}}, {createRef:()=>({current:null})});
for (const [index, rarity] of tiers.entries()) {
  const card = makeCard({...sample,rarity});
  const view = new Logic({card}).renderVals();
  assert.equal(card.tier,tierKeys[index]);
  assert.equal(view.symbol,'★'.repeat(index+1));
  assert.equal(view.imageSrc,image);
  assert.equal(view.isFull,index>=5);
  assert.equal(view.hasFoil,index>=2);
  assert.equal(view.holoWin,index>0 && index<5);
  const html = renderCard(card);
  assert(!html.includes('src="./support.js"'));
  assert(!html.includes('src="./image-slot.js"'));
  assert(!html.includes('./assets/card-back-doge.png'));
  let count=0;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) { new vm.Script(match[1]); count++; }
  assert.equal(count,6);
}
const card=makeCard(sample);
assert.equal(card.attacks[0].name,sample.attacks[0].name);
assert.equal(card.attacks[0].text,sample.attacks[0].text);
assert.equal(card.attacks[0].dmg,'20');
assert.equal(card.type,'raleur');
assert(card.attacks[1].text.length>0);
assert.throws(()=>makeCard({...sample,rarity:'invalid'}));
assert.throws(()=>makeCard({...sample,attacks:[]}));
assert.throws(()=>makeCard({...sample,image:'javascript:alert(1)'}));
assert.throws(()=>makeCard({...sample,attacks:[{name:'Bad',dmg:'NaN'}]}));
assert.throws(()=>makeCard({...sample,attacks:[{name:'Bad',dmg:'301'}]}));
const tricky=renderCard(makeCard({...sample,name:'$& </script><script>bad'}));
assert(tricky.includes('"name":"$& \\u003c/script>\\u003cscript>bad"'));
assert(!tricky.includes('<script>bad'));
console.log('PASS: seven rarity styles, supplied attacks, embedded assets, script syntax, validation and escaping.');

async function integration() {
  const base='http://127.0.0.1:4317';
  const config=await (await fetch(base+'/api/config')).json();
  assert.equal((await fetch(base)).status,200);
  assert.equal((await fetch(base+'/pipeline/app.js')).status,200);
  const denied=await fetch(base+'/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)});
  assert.equal(denied.status,403);
  for (const rarity of tiers) {
    const response=await fetch(base+'/api/render',{method:'POST',headers:{'Content-Type':'application/json','X-Card-Token':config.token},body:JSON.stringify({...sample,rarity})});
    assert.equal(response.status,200); assert((await response.json()).html.includes('<x-dc>'));
  }
  const response=await fetch(base+'/api/save',{method:'POST',headers:{'Content-Type':'application/json','X-Card-Token':config.token},body:JSON.stringify(sample)});
  assert.equal(response.status,200);
  const saved=await response.json();
  const html=await fetch(base+saved.html), json=await (await fetch(base+saved.json)).json();
  assert.equal(html.status,200); assert.equal(json.name,sample.name);
  assert.deepEqual(json.attacks[0].name,sample.attacks[0].name);
  const listing=await (await fetch(base+'/api/results')).json();
  assert(listing.files.includes(path.basename(saved.html)));
  console.log('PASS: live preview API, protected save, HTML and JSON round-trip.');
  console.log('Created example: '+saved.html);
}
if(process.argv.includes('--integration')) integration().catch(error=>{console.error(error);process.exitCode=1;});
