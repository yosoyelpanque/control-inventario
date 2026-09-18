const test=require('node:test');
const assert=require('node:assert/strict');
const {clean}=require('../src/data.js');
test('un respaldo conserva inventario y elimina identidad y tokens',()=>{
 const input={inventory:[{'CLAVE UNICA':'001'}],loggedIn:true,currentUser:{id:'otro'},accessToken:'secreto',refreshToken:'secreto',idToken:'secreto',serialNumberCache:{},notes:{'001':'Nota'}};
 const output=clean(input);
 assert.deepEqual(output,{inventory:input.inventory,notes:input.notes});
 assert.equal(input.loggedIn,true);
});
test('rechaza estructuras inválidas antes de persistirlas',()=>{
 for(const value of [null,[],true,'texto',{inventory:{}},{resguardantes:'incorrecto'}])assert.throws(()=>clean(value));
});
test('elimina claves peligrosas al importar JSON',()=>{
 const output=clean(JSON.parse('{"__proto__":{"loggedIn":true},"constructor":{},"inventory":[]}'));
 assert.deepEqual(output,{inventory:[]});assert.equal({}.loggedIn,undefined);
});
