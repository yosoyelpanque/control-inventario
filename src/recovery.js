(function(root){
 'use strict';
 const LIMIT=3;
 async function snapshot(storage,state,label){
  const images=[];for(const store of ['photos','layoutImages'])for(const item of await storage.getAllItems(store))images.push({store,...item});
  return {id:crypto.randomUUID(),at:Date.now(),label,state:structuredClone(InventoryData.clean(state)),drafts:await storage.getItem('appData','captureDrafts')||{notes:{},additional:{}},images,auditors:await InventoryTeam.exportDirectory(),rfid:await InventoryRFIDStore.exportPack(storage)};
 }
 async function create(storage,state,label){
  await storage.flush();const point=await snapshot(storage,state,label),points=await storage.getItem('appData','recoveryPoints')||[];
  await storage.setItem('appData','recoveryPoints',[point,...points].slice(0,LIMIT));return point;
 }
 async function restore(storage,id,current){
  await storage.flush();const points=await storage.getItem('appData','recoveryPoints')||[],point=points.find(p=>p.id===id);
  if(!point)throw Error('El punto de recuperación ya no está disponible');
  const before=await snapshot(storage,current,'Antes de restaurar un punto');
  await new Promise((resolve,reject)=>{
   const tx=storage.db.transaction(['appData','photos','layoutImages','rfidTags'],'readwrite');tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('No se pudo restaurar el punto'));
   try {
    for(const store of ['photos','layoutImages'])tx.objectStore(store).clear();
    for(const image of point.images)tx.objectStore(image.store).put(image.value,image.key);
    const app=tx.objectStore('appData');app.put(point.state,'mainState');app.put([],'changeHistory');app.put(point.drafts,'captureDrafts');app.put([before,...points].slice(0,LIMIT),'recoveryPoints');
    if(point.auditors)app.put(point.auditors,'auditorDirectory');
    if(point.rfid)InventoryRFIDStore.enqueue(tx,point.rfid);
   }catch(error){tx.abort();reject(error);}
  });return point;
 }
 root.InventoryRecovery={create,restore,snapshot,LIMIT};
})(globalThis);
