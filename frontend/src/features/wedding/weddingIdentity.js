import {makeAppearance,findPart} from './catalog';
export function weddingRole(profile){return profile?.is_admin&&['groom','bride'].includes(profile.wedding_role)?profile.wedding_role:null;}
export function weddingPersona(profile){return profile?.username==='shenqidayang'?'calm-girl':profile?.username==='lqc'?'lively-boy':'guest';}
export function weddingAppearance(role,persona='guest'){
 const a=makeAppearance(role==='bride'||persona==='calm-girl'?4:role==='groom'||persona==='lively-boy'?2:0);
 if(persona==='calm-girl')Object.assign(a,{hair:findPart('hair','Black',p=>p.name==='blackWoman3').id,sleeve:'long',shoes:findPart('shoes','Tan',p=>p.name.endsWith('3')).id});
 if(persona==='lively-boy')Object.assign(a,{sleeve:'shorter',shoes:findPart('shoes','Blue',p=>p.name.endsWith('1')).id});
 if(role==='groom')Object.assign(a,{formalStyle:'tuxedo',formalColor:'midnight',shirt:findPart('shirt','White',p=>p.name.endsWith('5')).id,sleeve:'long',shoes:'dress-shoe-oxford-black'});
 if(role==='bride')Object.assign(a,{formalStyle:'bridal',formalColor:'white',sleeve:'none',headwear:'veil',veil:true,shoes:'dress-shoe-stiletto-ivory'});
 return a;
}
