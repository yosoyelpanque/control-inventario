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
      const manifestFile=zip.file('backup-manifest.json');
      if(manifestFile){
        const manifest=JSON.parse(await manifestFile.async('string'));
        if(manifest.inventory!==state.inventory.length||manifest.additional!==(state.additionalItems||[]).length||manifest.images!==images.length)throw new Error('El contenido del respaldo no coincide con su resumen');
        if(manifest.version>=2&&(!rfid||manifest.rfidTags!==rfid.records.length))throw new Error('El catálogo RFID del respaldo está incompleto');
      }
      return {state,images,rfid};
    },
    async restore(file, storage) {
      const {state,images,rfid}=await this.inspect(file);
      const preservedRFID=rfid?null:await storage.getItem('appData','rfidCatalog');
      await storage.flush();
      await new Promise((resolve,reject) => {
        const tx=storage.db.transaction(['appData','photos','layoutImages','rfidTags'],'readwrite');
        tx.oncomplete=resolve;
        tx.onabort=tx.onerror=()=>reject(tx.error || new Error('No se pudo restaurar; se conserva el inventario anterior'));
        for (const name of ['appData','photos','layoutImages']) tx.objectStore(name).clear();
        tx.objectStore('appData').put(state,'mainState');
        if(rfid)InventoryRFIDStore.enqueue(tx,rfid);
        else if(preservedRFID)tx.objectStore('appData').put(preservedRFID,'rfidCatalog');
        for (const item of images) tx.objectStore(item.store).put(item.value,item.key);
      });
    }
  };
})();
