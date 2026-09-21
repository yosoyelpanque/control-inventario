(function () {
  'use strict';
  window.InventoryBackups = {
    async inspect(file) {
      const zip = await JSZip.loadAsync(file, {checkCRC32:true});
      const session = zip.file('session.json');
      if (!session) throw new Error('El respaldo no contiene session.json');
      const state = InventoryData.clean(JSON.parse(await session.async('string')));
      if (!Array.isArray(state.inventory) || !Array.isArray(state.resguardantes)) throw new Error('Respaldo incompleto');
      const images = [];
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        const match = /^(photos|layoutImages)\/([^/]+)$/.exec(entry.name);
        if (match) images.push({store:match[1],key:match[2],value:await entry.async('blob')});
      }
      const rfidFile=zip.file('rfid-catalog.json');
      const rfid=rfidFile?InventoryRFIDCore.validate(JSON.parse(await rfidFile.async('string'))):null;
      const auditorsFile=zip.file('auditors.json');
      const auditors=auditorsFile?InventoryTeam.validateDirectory(JSON.parse(await auditorsFile.async('string'))):null;
      const manifestFile=zip.file('backup-manifest.json');
      if(manifestFile){
        const manifest=JSON.parse(await manifestFile.async('string'));
        if(manifest.inventory!==state.inventory.length||manifest.additional!==(state.additionalItems||[]).length||manifest.images!==images.length)throw new Error('El contenido del respaldo no coincide con su resumen');
        if(manifest.version>=2&&(!rfid||manifest.rfidTags!==rfid.records.length))throw new Error('El catálogo RFID del respaldo está incompleto');
        if(manifest.version>=3&&(!auditors||manifest.auditors!==auditors.length))throw new Error('El catálogo de auditores del respaldo está incompleto');
      }
      return {state,images,rfid,auditors};
    },
    async restore(file, storage, currentState) {
      const {state,images,rfid,auditors}=await this.inspect(file);
      const preservedRFID=rfid?null:await storage.getItem('appData','rfidCatalog');
      await storage.flush();
      const current=currentState||await storage.getItem('appData','mainState')||{inventory:[],resguardantes:[]};
      const before=await InventoryRecovery.snapshot(storage,current,'Antes de restaurar respaldo ZIP');
      const points=await storage.getItem('appData','recoveryPoints')||[];
      const previousAuditors=await InventoryTeam.exportDirectory();
      await new Promise((resolve,reject) => {
        const tx=storage.db.transaction(['appData','photos','layoutImages','rfidTags'],'readwrite');
        tx.oncomplete=resolve;
        tx.onabort=tx.onerror=()=>reject(tx.error || new Error('No se pudo restaurar; se conserva el inventario anterior'));
        try {
          for (const name of ['appData','photos','layoutImages']) tx.objectStore(name).clear();
          const app=tx.objectStore('appData');
          app.put(state,'mainState');
          app.put(auditors||previousAuditors,'auditorDirectory');
          app.put([before,...points].slice(0,InventoryRecovery.LIMIT),'recoveryPoints');
          if(rfid)InventoryRFIDStore.enqueue(tx,rfid);
          else if(preservedRFID)app.put(preservedRFID,'rfidCatalog');
          for (const item of images) tx.objectStore(item.store).put(item.value,item.key);
        } catch(error) {tx.abort();reject(error);}
      });
    }
  };
})();
