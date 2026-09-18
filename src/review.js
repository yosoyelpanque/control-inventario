(function(root){
 'use strict';
 const text=v=>String(v??'').trim();
 const serial=v=>text(v).toUpperCase();
 const emptySeries=new Set(['','S/N','SN','SIN SERIE','SIN NUMERO DE SERIE','SIN NÚMERO DE SERIE','NO APLICA','N/A','NA','-','0']);
 function review(state,area='all'){
  const users=state.resguardantes||[];
  function owner(item,additional){if(additional&&item.resguardanteId)return users.find(u=>u.id===item.resguardanteId);const matches=users.filter(u=>u.name===(additional?item.usuario:item['NOMBRE DE USUARIO']));return matches.length===1?matches[0]:null;}
  const records=[...(state.inventory||[]).map(item=>({item,kind:'inventory',id:item['CLAVE UNICA'],key:item['CLAVE UNICA'],description:item.DESCRIPCION||item.DESCRripcion,serial:item.SERIE,area:item.areaOriginal,user:owner(item,false),located:item.UBICADO==='SI'})),...(state.additionalItems||[]).map(item=>{const u=owner(item,true);return {item,kind:'additional',id:item.id,key:item.claveAsignada,description:item.descripcion,serial:item.serie,area:u?.area||'Sin área asignada',user:u,located:true};})];
  const scoped=records.filter(r=>area==='all'||text(r.area)===area);
  const issues=[];
  for(const r of scoped){const reasons=[],types=[];const add=(type,message)=>{types.push(type);reasons.push(message);};

   if(!text(r.description))add('missing','Sin descripción');
   if(!text(r.key)&&!(r.kind==='additional'&&(r.item.personal==='Si'||r.item.posesion==='Propiedad del Grupo')))add('missing','Sin clave de inventario');
   if(r.located&&!r.user)add('missing','Usuario sin asignar, inexistente o ambiguo');
   if(r.located&&!text(r.item.ubicacionEspecifica))add('missing','Sin ubicación');
   if(r.kind==='additional'&&r.item.personal==='Si'&&r.item.tieneFormatoEntrada!==true)add('entry',r.item.tieneFormatoEntrada===false?'Bien personal sin formato de entrada':'Formato de entrada sin confirmar');
   if(reasons.length)issues.push({...r,reasons,types});
  }
  return {total:scoped.length,located:scoped.filter(r=>r.kind==='inventory'&&r.located).length,pending:scoped.filter(r=>r.kind==='inventory'&&!r.located),additional:scoped.filter(r=>r.kind==='additional').length,issues};
 }
 root.InventoryReview={review};if(typeof module!=='undefined')module.exports={review};
})(globalThis);
