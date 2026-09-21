const test=require('node:test'),assert=require('node:assert/strict'),S=require('../src/search.js');
const state={inventory:[{'CLAVE UNICA':'01',DESCRIPCION:'Sillón azul',areaOriginal:'1'},{'CLAVE UNICA':'02',DESCRIPCION:'Monitor',areaOriginal:'1'}],notes:{'01':'Reparación pendiente','02':'REPARACION requerida','03':'Otra nota'},archivedNotes:{'04':'Reparación terminada'},resguardantes:[{name:'José Pérez',area:'1'}]};
test('notas encuentra todas las coincidencias sin depender de acentos o mayúsculas',()=>{
 assert.deepEqual(S.notes(state,false,'reparacion'),['01','02']);
 assert.deepEqual(S.notes(state,false,'sillon pendiente'),['01']);
 assert.deepEqual(S.notes(state,true,'reparacion'),['04']);
 assert.deepEqual(S.notes(state,false,'ninguna'),[]);
 assert.equal(S.notes(state,false,'').length,3);
});
test('reportes combina tipo, área y usuario respetando pendientes por área',()=>{
 const types=[{value:'resguardo',label:'Resguardo Individual'},{value:'pendientes',label:'Bienes Pendientes'},{value:'adicionales',label:'Adicionales'}];
 const r=S.reports(state,types,'jose resguardo',{'1':'Dirección General'});
 assert.equal(r.length,1);assert.equal(r[0].user,'José Pérez');assert.equal(r[0].area,'1');
 assert.equal(S.reports(state,types,'pendientes jose',{}).length,0);
 assert.equal(S.reports(state,types,'adicionales direccion',{'1':'Dirección General'})[0].user,'__area__');
});
