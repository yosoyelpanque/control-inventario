'use strict';
importScripts('../vendor/xlsx.js','rfid-core.js');
self.onmessage=async e=>{try{
 const {files,current}=e.data;let incoming=InventoryRFIDCore.empty();
 for(const file of files){
  self.postMessage({progress:'Analizando '+file.name+'…'});
  if(/\.json$/i.test(file.name)){incoming=InventoryRFIDCore.merge(incoming,InventoryRFIDCore.validate(JSON.parse(new TextDecoder().decode(file.data))));}
  else{const digest=await crypto.subtle.digest('SHA-256',file.data);file.hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');file.at=new Date().toISOString();const wb=XLSX.read(file.data,{type:'array'});InventoryRFIDCore.parseWorkbook(wb,file,XLSX,incoming);}
 }
 if(!incoming.records.length)throw Error('No se encontraron asociaciones RFID con el formato esperado. Revisa los encabezados y los tags.');
 self.postMessage({progress:'Comparando con el catálogo guardado…'});
 const pack=InventoryRFIDCore.merge(current,incoming);pack.importSummary={...InventoryRFIDCore.summarize(incoming),...incoming.stats};self.postMessage({pack});
}catch(error){self.postMessage({error:error.message});}};
