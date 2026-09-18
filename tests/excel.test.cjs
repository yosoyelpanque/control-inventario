const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const X=require('../vendor/xlsx.js'),I=require('../src/excel-import.js');
const item=(key,serial='001')=>({'CLAVE UNICA':key,DESCRIPCION:'Bien',MARCA:'Marca',MODELO:'Modelo',SERIE:serial,areaOriginal:'0604500',listadoOriginal:'LIBRO: CAMARA',UBICADO:'NO'});
test('deduplica incluso dentro del mismo archivo sin tocar la asignación anterior',()=>{
 const old={...item('123456'),UBICADO:'SI','NOMBRE DE USUARIO':'Prueba'};
 const result=I.merge([old],[{filename:'a',items:[item('123456'),item('234567'),item('234567')]}]);
 assert.equal(result.added,1);assert.equal(result.duplicates,2);assert.equal(result.items[0],old);
});
test('las diferencias de serie se informan y no se sobrescriben',()=>{
 const result=I.merge([item('123456','001')],[{filename:'a',items:[item('123456','1')]}]);
 assert.equal(result.items[0].SERIE,'001');assert.equal(result.conflicts[0].changes[0].incoming,'1');
});
const fixtureRoot=process.env.INVENTORY_FIXTURES;
test('los cuatro archivos originales producen 2088 bienes y conservan las series Oracle', {skip:!fixtureRoot},()=>{
 const load=n=>I.parse(fs.readFileSync(path.join(fixtureRoot,n)),n,X);
 const oracle=[load('0604500_BM_oracle.xls'),load('0604500_C_oracle.xls')];
 const excel=[load('0604500_BM.xls.xlsm'),load('0604500_C.xls.xlsm')];
 for(const batches of [oracle,excel])assert.deepEqual(batches.map(b=>b.items.length),[864,1224]);
 for(const batch of [...oracle,...excel]){assert.deepEqual(batch.dates,['09/06/2026']);assert.equal(batch.location,'ESTACIONAMIENTO DOS');assert.equal(batch.responsible.name,'MOCTEZUMA ANDRADE JOAQUIN');}
 const result=I.merge([],oracle.concat(excel));
 assert.equal(result.added,2088);assert.equal(result.duplicates,2088);assert.equal(result.conflicts.length,9);
 assert.equal(result.items.find(i=>i['CLAVE UNICA']==='374475').SERIE,'7103001714766683071601');
 assert.equal(result.items.find(i=>i['CLAVE UNICA']==='40534').SERIE,'071691');
 assert.equal(oracle[1].items.find(i=>i['CLAVE UNICA']==='465845').MARCA,'TRUE');
 assert.equal(excel[1].warnings.length,6);
 assert.ok(oracle.every(b=>b.responsible&&b.areaId==='0604500'));
});
