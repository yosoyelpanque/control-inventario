(function(root){
 'use strict';
 function edit(state,id,oldLocation,values){
  const next=structuredClone(state),user=next.resguardantes.find(u=>u.id===id);
  if(!user||(user.locations||[]).indexOf(oldLocation)<0)throw Error('La ubicación ya no está disponible. Vuelve a abrir el usuario.');
  const name=String(values.name||'').trim(),edificio=String(values.edificio||'').trim(),piso=String(values.piso||'').trim();
  if(!name||!edificio||!piso)throw Error('Completa el nombre de la ubicación, el edificio y el piso.');
  if(name.length>120||edificio.length>100||piso.length>100)throw Error('Usa un nombre de hasta 120 caracteres y edificio/piso de hasta 100.');
  if(['__proto__','prototype','constructor'].includes(name))throw Error('Elige otro nombre de ubicación.');
  if(user.locations.some(l=>l!==oldLocation&&l.trim().toLocaleUpperCase('es')===name.toLocaleUpperCase('es')))throw Error('Este resguardante ya tiene otra ubicación con ese nombre.');
  const owns=(i,field)=>i.resguardanteId?i.resguardanteId===id:i[field]===user.name;
  const inv=next.inventory.filter(i=>owns(i,'NOMBRE DE USUARIO')&&i.ubicacionEspecifica===oldLocation),adic=next.additionalItems.filter(i=>owns(i,'usuario')&&i.ubicacionEspecifica===oldLocation);
  if(next.resguardantes.filter(u=>u.name===user.name).length>1&&[...inv,...adic].some(i=>!i.resguardanteId))throw Error('Hay resguardantes con el mismo nombre y bienes sin identificador. Distingue sus nombres antes de editar la ubicación.');
  user.locations=user.locations.map(l=>l===oldLocation?name:l);user.locationWithId=user.locations[0]||'';
  user.locationDetails={...user.locationDetails};delete user.locationDetails[oldLocation];user.locationDetails[name]={...(state.resguardantes.find(u=>u.id===id).locationDetails?.[oldLocation]||{}),edificio,piso};
  for(const item of [...inv,...adic])item.ubicacionEspecifica=name;
  const sourcePhoto=id+'|'+oldLocation,targetPhoto=id+'|'+name;next.locationPhotos={...next.locationPhotos};
  if(sourcePhoto!==targetPhoto){if(next.locationPhotos[sourcePhoto])next.locationPhotos[targetPhoto]=true;delete next.locationPhotos[sourcePhoto];}
  if(next.activeResguardante?.id===id)next.activeResguardante=user;
  return {next,sourcePhoto,targetPhoto,inventoryCount:inv.length,additionalCount:adic.length,name};
 }
 root.InventoryLocationEdit={edit};if(typeof module!=='undefined')module.exports={edit};
})(globalThis);
