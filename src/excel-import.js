(function(root){
 'use strict';
 const text=value=>String(value??'').replace(/\u00a0/g,' ').trim();
 const normalize=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 function parse(data,filename,XLSX){
  const book=XLSX.read(data,{type:'array',raw:true});
  const tables=book.SheetNames.map(name=>{
   const sheet=book.Sheets[name],range=XLSX.utils.decode_range(sheet['!ref']||'A1');
   range.s={r:0,c:0};
   return {name,rows:XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',range})};
  });
  const cells=tables.flatMap(t=>t.rows.flat()).filter(v=>typeof v==='string');
  // Oracle puts area metadata outside its HTML tables; treat it only as text.
  const prefix=new TextDecoder().decode(new Uint8Array(data).subarray(0,256));
  if (/^\s*(?:<!doctype|<html)/i.test(prefix)) {
   const html=new TextDecoder().decode(data);
   cells.push(...html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<\/(?:p|div|tr|h\d)>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/gi,' ').split('\n'));
  }
  let areaId='',areaName='',bookType='Sin Tipo';
  for(const cell of cells){
   const area=text(cell).match(/(?:^|\s)[ÁA]REA\s+(\d+)[\s:-]*(.*)/i);
   if(area&&!areaId){areaId=area[1];areaName=text(area[2]);}
   const type=text(cell).match(/LIBRO:\s*([^\r\n]+)/i);
   if(type&&bookType==='Sin Tipo')bookType='LIBRO: '+text(type[1]);
  }
  let mapping;
  for(const table of tables)for(const row of table.rows){
   const headers=row.map(normalize);
   if(headers.includes('CLAVE UNICA')&&headers.includes('DESCRIPCION')){
    mapping={key:headers.indexOf('CLAVE UNICA'),description:headers.indexOf('DESCRIPCION'),brand:headers.indexOf('MARCA'),model:headers.indexOf('MODELO'),serial:headers.indexOf('SERIE')};break;
   }
  }
  if(!mapping)throw Error(filename+': no se encontró el encabezado de inventario');
  if(!areaId)throw Error(filename+': no se encontró el área del listado');
  const items=[],warnings=[];
  for(const table of tables)for(const row of table.rows){
   const sourceKey=text(row[mapping.key]);
   // XLSM stores BM keys as numbers; Oracle retains insignificant decimal zeros.
   const key=sourceKey.replace(/^\./,'0.').replace(/^(0\.\d*?[1-9])0+$/,'$1');
   if(!/^(?:\d{5,6}|0\.\d+)$/.test(key))continue;
   const description=text(row[mapping.description]);
   if(!description)throw Error(filename+': el bien '+key+' no tiene descripción');
   const serial=row[mapping.serial];
   if(typeof serial==='number'&&!Number.isSafeInteger(serial))warnings.push(key+': serie numérica cuya precisión no puede garantizarse; revisar el original');
   items.push({'CLAVE UNICA':key,DESCRIPCION:description,MARCA:text(row[mapping.brand]),MODELO:text(row[mapping.model]),SERIE:text(serial),'NOMBRE DE USUARIO':'',UBICADO:'NO',RE_ETIQUETADO:'NO',areaOriginal:areaId,listadoOriginal:bookType});
  }
  if(!items.length)throw Error(filename+': no se encontraron bienes válidos');
  const footer=tables.flatMap(t=>t.rows).slice(-40).flat().map(text).filter(Boolean);
  const responsibleIndex=footer.findIndex(v=>/^(RESPONSABLE|NOMBRE|TITULAR|RECIBE)\s*:?$/i.test(v));
  const responsible=responsibleIndex>=0&&footer[responsibleIndex+1]?{area:areaId,areaName,name:footer[responsibleIndex+1],title:footer[responsibleIndex+2]||''}:null;
  const metadata=cells.map(text).filter(Boolean);
  const dates=[...new Set(metadata.flatMap(cell=>[...cell.matchAll(/\bFecha(?: de consulta)?\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/gi)].map(m=>m[1])))];
  const areaIndex=metadata.findIndex(cell=>/^[ÁA]REA\s+\d+/i.test(cell));
  const candidate=metadata[areaIndex+1]||'';
  const location=areaIndex>=0&&candidate&&!/CLAVE|LIBRO:|FECHA|DESCRIPCI[ÓO]N|^[ÁA]REA\s/i.test(candidate)&&candidate.length<200?candidate:'';
  return {filename,items,areaId,areaName,bookType,tables:tables.length,warnings,responsible,dates,location};
 }
 function merge(existing,batches){
  const byKey=new Map(existing.map(item=>[item['CLAVE UNICA'],item]));
  let duplicates=0;const conflicts=[];
  for(const batch of batches)for(const item of batch.items){
   const key=item['CLAVE UNICA'],old=byKey.get(key);
   if(old){
    duplicates++;
    const fields=['DESCRIPCION','MARCA','MODELO','SERIE','areaOriginal','listadoOriginal'].filter(field=>text(old[field])!==text(item[field]));
    if(fields.length)conflicts.push({key,file:batch.filename,changes:fields.map(field=>({field,current:text(old[field]),incoming:text(item[field])}))});
   }else byKey.set(key,item);
  }
  return {items:[...byKey.values()],added:byKey.size-existing.length,duplicates,conflicts};
 }
 root.InventoryExcel={parse,merge};
 if(typeof module!=='undefined')module.exports={parse,merge};
})(globalThis);
