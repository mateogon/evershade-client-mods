'use strict';
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dropName=d=>d.item||`${d.itemType||'Equipo'} · T${d.tier??'?'}`;
const percent=n=>Number.isFinite(Number(n))?`${new Intl.NumberFormat('es-CL',{maximumFractionDigits:4}).format(Number(n)*100)}%`:'—';
const matchBoss=(b,q)=>normalize([b.displayId,b.id,b.group,b.category,...b.drops.map(dropName)].join(' ')).includes(normalize(q));
if(typeof module!=='undefined')module.exports={normalize,dropName,percent,matchBoss};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),data=window.DROP_DATA;
 if(!data?.bosses?.length){$('detail').textContent='No hay catálogo. Ejecuta open-drops.ps1 para generarlo.';}
 else {
 const bosses=[...data.bosses].sort((a,b)=>(a.displayId||a.id).localeCompare(b.displayId||b.id));
 let selected=bosses.find(b=>b.id==='Septavius the Ghost God')||bosses[0];
 const node=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
 function list(){
  const visible=bosses.filter(b=>matchBoss(b,$('search').value));
  $('count').textContent=`${visible.length} / ${bosses.length} monstruos`;
  if(!visible.includes(selected))selected=visible[0]||null;
  $('monsters').replaceChildren();
  for(const b of visible){const btn=node('button',b.displayId||b.id);btn.type='button';btn.setAttribute('aria-current',String(b===selected));btn.append(node('small',`${b.category} · ${b.drops.length} drops`));btn.onclick=()=>{selected=b;list();};$('monsters').append(btn);}
  if(!visible.length)$('monsters').append(node('p','Sin coincidencias.','empty'));
  render();
 }
 function render(){
  $('detail').replaceChildren();$('rows').replaceChildren();
  if(!selected){$('detail').append(node('h2','No hay monstruos para esta búsqueda'));$('drop-count').textContent='';$('empty').hidden=false;return;}
  $('detail').append(node('div',`${selected.category} / ${selected.group||'Bestiario'}`,'kicker'),node('h2',selected.displayId||selected.id));
  const stats=node('div','','stats');
  for(const [label,value] of [['HP',Number(selected.hp).toLocaleString('es-CL')],['Defensa',selected.defense],['Daño',`${selected.minDamage}–${selected.maxDamage}`],['ID',selected.type]]){const box=node('div','');box.append(node('span',label),node('strong',value));stats.append(box);}
  $('detail').append(stats);
  const rows=selected.drops.filter(d=>normalize(dropName(d)).includes(normalize($('item').value))&&($('kind').value==='all'||($('kind').value==='named'?!!d.item:!d.item)));
  rows.sort((a,b)=>$('sort').value==='name'?dropName(a).localeCompare(dropName(b)):($('sort').value==='rare'?1:-1)*(Number(a.probability)-Number(b.probability)));
  $('drop-count').textContent=`${rows.length} de ${selected.drops.length} entradas de loot`;
  for(const d of rows){const tr=node('tr','');tr.append(node('td',dropName(d),d.item?'':'tier'),node('td',percent(d.probability)),node('td',d.rolls||'1'),node('td',Number(d.threshold)>0?percent(d.threshold):'Sin mínimo'));$('rows').append(tr);}
  $('empty').hidden=rows.length>0;
 }
 $('search').addEventListener('input',list);
 for(const id of ['item','kind','sort'])$(id).addEventListener('input',render);
 $('source').textContent=`CATÁLOGO LOCAL · Generado ${data.generated} · SHA ${data.hash.slice(0,12)}`;
 list();
 }
}
