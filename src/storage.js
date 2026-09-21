(function () {
  'use strict';
  const pending = new Set();
  const failures = new Map();
  window.addEventListener('beforeunload',e=>{if(pending.size||failures.size){e.preventDefault();e.returnValue='';}});
  const api = {
    db: null, name: null,
    acquireWorkspace() {
      // One writer for the entire workspace, including photos, drafts and RFID.
      // The browser releases this lock when the document closes or reloads.
      return new Promise((resolve,reject) => {
        if (!navigator.locks) return reject(new Error('Actualiza el navegador para proteger el inventario entre pestañas.'));
        navigator.locks.request('inventario-parejas-workspace', async () => {
          resolve();
          await new Promise(() => {});
        }).catch(reject);
      });
    },
    async init(accountId) {
      if (api.db) return;
      if (!accountId) throw new Error('Falta el espacio de trabajo local');
      api.name = 'InventarioPro-vNext-' + accountId;
      api.db = await new Promise((resolve,reject) => {
        const req = indexedDB.open(api.name, 2);
        req.onupgradeneeded = () => {
          for (const store of ['photos','layoutImages','appData']) if(!req.result.objectStoreNames.contains(store))req.result.createObjectStore(store);
          if(!req.result.objectStoreNames.contains('rfidTags')){const tags=req.result.createObjectStore('rfidTags');tags.createIndex('keys','keys',{multiEntry:true});tags.createIndex('conflict','conflict');}
        };
        req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Cierra otras pestañas para abrir el almacenamiento'));
      });
    },
    setItem(store,key,value,related=[]) {
      const task = new Promise((resolve,reject) => {
        if (!api.db) return reject(new Error('Almacenamiento no disponible'));
        const tx = api.db.transaction([...new Set([store,...related.map(item=>item.store)])],'readwrite');
        try {
          tx.objectStore(store).put(value,key);
          for(const item of related)tx.objectStore(item.store).put(item.value,item.key);
        } catch(error) { tx.abort();reject(error);return; }
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('No se pudo completar el guardado'));
      });
      pending.add(task);
      window.dispatchEvent(new CustomEvent('inventory-save', {detail:'Guardando en este equipo…'}));
      task.then(() => {
        pending.delete(task);failures.delete(store+'|'+key);
        if (!pending.size && !failures.size) window.dispatchEvent(new CustomEvent('inventory-save', {detail:'Guardado en este equipo a las '+new Date().toLocaleTimeString('es-MX')+' · Almacenamiento local'}));
      }, error => {
        pending.delete(task);failures.set(store+'|'+key,error);
        window.dispatchEvent(new CustomEvent('inventory-save', {detail:'Error de guardado: conserva la aplicación abierta y exporta un respaldo'}));
      });
      return task;
    },
    getItem(store,key) {
      return new Promise((resolve,reject) => {
        if (!api.db) return reject(new Error('Almacenamiento no disponible'));
        const req = api.db.transaction(store).objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    getAllItems(store) {
      return new Promise((resolve,reject) => {
        if (!api.db) return reject(new Error('Almacenamiento no disponible'));
        const tx = api.db.transaction(store);
        const objectStore = tx.objectStore(store);
        const keys = objectStore.getAllKeys();
        const values = objectStore.getAll();
        tx.oncomplete = () => resolve(keys.result.map((key,i) => ({key,value:values.result[i]})));
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('Error leyendo el respaldo'));
      });
    },
    track(task,key) {
      pending.add(task);window.dispatchEvent(new CustomEvent('inventory-save',{detail:'Guardando catálogo RFID…'}));
      task.then(()=>{pending.delete(task);window.dispatchEvent(new CustomEvent('inventory-save',{detail:'Catálogo RFID guardado en este equipo'}));},()=>{pending.delete(task);window.dispatchEvent(new CustomEvent('inventory-save',{detail:'No se guardó el catálogo RFID. Se conserva el anterior'}));});return task;
    },
    async flush() { await Promise.all([...pending]);if(failures.size)throw new Error('Hay cambios que no se pudieron guardar'); }
  };
  window.InventoryStorage = api;
})();
