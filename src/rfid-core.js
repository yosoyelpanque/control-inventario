(function(root){
 'use strict';
 const text=v=>String(v==null?'':v).trim();
 function key(v){
  const s=text(v).toUpperCase();
  if(/^0?\.\d+$/.test(s))return '0.'+s.split('.')[1].replace(/0+$/,'');
  return s;
 }
 const validKey=k=>/^(?:[1-9]\d*|0\.\d*[1-9]|CD-[A-Z0-9-]+)$/.test(k);
 const tag=v=>text(v).toUpperCase();
 const validTag=t=>/^[0-9A-F]{24}$/.test(t);
 const header=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 function empty(){return {format:'inventario-rfid',version:1,sources:[],records:[],issues:[],stats:{rows:0,withTag:0,withoutTag:0,invalid:0,skippedSheets:[]}};}
 function summarize(pack){
  const keys=new Set();let associations=0,conflicts=0,pending=0;
  for(const r of pack.records){associations+=r.links.length;for(const l of r.links)keys.add(l.key);if(r.links.length>1){conflicts++;if(!r.selectedKey)pending++;}}
  return {tags:pack.records.length,keys:keys.size,associations,conflicts,pending};
 }
 function validate(pack){
  if(!pack||pack.format!=='inventario-rfid'||pack.version!==1||!Array.isArray(pack.records)||!Array.isArray(pack.sources)||!Array.isArray(pack.issues))throw Error('Formato de catálogo RFID no reconocido');
  const sourceIds=new Set(),seen=new Set();
  for(const s of pack.sources){if(!s||typeof s.id!=='string'||sourceIds.has(s.id)||typeof s.file!=='string'||typeof s.sheet!=='string'||typeof s.column!=='string')throw Error('Origen RFID no válido');sourceIds.add(s.id);}
  for(const r of pack.records){
   if(!validTag(r.tag)||seen.has(r.tag)||!Array.isArray(r.links)||!r.links.length)throw Error('Tag repetido o no válido en el catálogo');seen.add(r.tag);const keys=new Set();
   for(const l of r.links){if(!validKey(l.key)||key(l.key)!==l.key||keys.has(l.key)||!Array.isArray(l.originals)||!l.originals.every(v=>typeof v==='string')||!Array.isArray(l.sources)||!l.sources.length||!l.sources.every(s=>sourceIds.has(s))||typeof l.description!=='string'||typeof l.area!=='string')throw Error('Asociación RFID no válida');keys.add(l.key);}
   if(r.selectedKey&&!keys.has(r.selectedKey))throw Error('Resolución RFID no válida');
  }
  return pack;
 }
 function merge(current,incoming){
  validate(current);validate(incoming);
  const out=empty(),map=new Map(current.records.map(r=>[r.tag,structuredClone(r)]));
  out.sources=[...new Map([...current.sources,...incoming.sources].map(s=>[s.id,s])).values()];
  let added=0;
  for(const r of incoming.records){
   let dest=map.get(r.tag);if(!dest){map.set(r.tag,structuredClone(r));added+=r.links.length;continue;}
   for(const l of r.links){const old=dest.links.find(v=>v.key===l.key);if(!old){dest.links.push(structuredClone(l));delete dest.selectedKey;added++;}else{old.originals=[...new Set([...old.originals,...l.originals])];old.sources=[...new Set([...old.sources,...l.sources])];}}
   // Importing an old decision must never resolve a local ambiguity automatically.
  }
  out.records=[...map.values()];
  out.issues=[...new Map([...current.issues,...incoming.issues].map(v=>[JSON.stringify(v),v])).values()];
  out.stats=incoming.stats;out.summary=summarize(out);out.added=added;out.baseRevision=current.updatedAt||null;return out;
 }
 function parseWorkbook(wb,file,XLSX,pack=empty()){
  const map=new Map(pack.records.map(r=>[r.tag,r]));
  for(const name of wb.SheetNames){
   const sheet=wb.Sheets[name];if(!sheet['!ref'])continue;
   const range=XLSX.utils.decode_range(sheet['!ref']);
   const cell=(r,c)=>{const v=sheet[XLSX.utils.encode_cell({r,c})];return v?v.v:undefined;};
   let row=-1,headers=[];
   for(let r=range.s.r;r<=Math.min(range.e.r,range.s.r+15);r++){const h=[];for(let c=0;c<=range.e.c;c++)h.push(header(cell(r,c)));if(h.some(v=>v==='CLAVE UNICA'||v==='NUMERO DE ACTIVO')){row=r;headers=h;break;}}
   const ki=headers.findIndex(v=>v==='CLAVE UNICA'||v==='NUMERO DE ACTIVO'),cols=headers.map((v,i)=>/^TAG ID\b/.test(v)?i:-1).filter(i=>i>=0);
   if(row<0||!cols.length){pack.stats.skippedSheets.push(file.name+' / '+name);continue;}
   const di=headers.findIndex(v=>v.startsWith('DESCRIPCION')),ai=headers.findIndex(v=>v==='AREA'||v==='AREAS');
   const sources=cols.map(c=>{const id=file.hash+'|'+name+'|'+c;const s={id,file:file.name,sheet:name,column:text(cell(row,c)),period:text(cell(row,c)).replace(/^TAG ID\s*/i,''),importedAt:file.at};if(!pack.sources.some(v=>v.id===id))pack.sources.push(s);return s;});
   for(let r=row+1;r<=range.e.r;r++){
    const original=text(cell(r,ki)),k=key(original);if(!original&&!cols.some(c=>text(cell(r,c))))continue;pack.stats.rows++;let found=false;
    for(let n=0;n<cols.length;n++){
     const raw=cell(r,cols[n]),t=tag(raw);if(!t||t==='0')continue;
     if(!validTag(t)||!validKey(k)){pack.stats.invalid++;pack.issues.push({file:file.name,sheet:name,row:r+1,column:XLSX.utils.encode_col(cols[n]),key:original,value:t,reason:!validKey(k)?'Clave no reconocida':'Tag fuera del formato hexadecimal de 24 caracteres'});continue;}
     found=true;let rec=map.get(t);if(!rec){rec={tag:t,links:[]};map.set(t,rec);}let link=rec.links.find(l=>l.key===k);
     if(!link){link={key:k,originals:[],sources:[],description:text(cell(r,di)),area:text(cell(r,ai))};rec.links.push(link);}
     if(!link.originals.includes(original))link.originals.push(original);if(!link.sources.includes(sources[n].id))link.sources.push(sources[n].id);
    }
    pack.stats[found?'withTag':'withoutTag']++;
   }
  }
  pack.records=[...map.values()];return pack;
 }
 root.InventoryRFIDCore={key,tag,validTag,empty,summarize,validate,merge,parseWorkbook};
 if(typeof module!=='undefined')module.exports=root.InventoryRFIDCore;
})(globalThis);
