import request from '../../utils/request';
import {weddingAppearance} from './weddingIdentity';
import {withDefaultFace} from './faceLayouts';

const snapshots=new Map();
export async function loadWeddingPeople(profile,{signal}={}){
 const key=`${profile?.username||''}:${localStorage.getItem('token')||''}`;
 let snapshot=snapshots.get(key);if(!snapshot){snapshot={data:null,etag:'',updated:0,pending:null};snapshots.set(key,snapshot);}
 if(snapshot.data&&Date.now()-snapshot.updated<30000)return snapshot.data;
 if(!snapshot.pending)snapshot.pending=request.get('/wedding/people',{signal,headers:snapshot.etag?{'If-None-Match':snapshot.etag}:{},validateStatus:s=>s===200||s===304}).then(response=>{
  if(response.status===200){snapshot.data=response.data;snapshot.etag=response.headers.etag||'';}snapshot.updated=Date.now();return snapshot.data;
 }).finally(()=>{snapshot.pending=null;});
 return snapshot.pending;
}

export function createWeddingPeople(people,{username,role,persona='guest',appearance}={}){
 const couple=[{name:'新郎',username:null,kind:'groom',role:'groom',x:744,y:259},{name:'新娘',username:null,kind:'bride',role:'bride',x:856,y:259}];
 const visitorSpots=[[650,490],[950,490],[450,570],[1150,570],[590,700],[1010,700],[430,710],[1170,710]];
 const actors=couple.map(a=>({...a,direction:'front',appearance:weddingAppearance(a.role)}));
 const visitors=[...['shenqidayang','lqc'].flatMap(name=>people.filter(p=>p.username===name)),...people.filter(p=>p.username!=='shenqidayang'&&p.username!=='lqc')];
 let n=0;
 for(const person of visitors){
  if(person.role==='groom'||person.role==='bride'){
   const actor=actors.find(a=>a.role===person.role),base={...weddingAppearance(person.role),...(person.appearance||{})};Object.assign(actor,{name:person.name,username:person.username,appearance:person.role==='groom'?base:withDefaultFace(base,person.facePreset,person.appearance)});continue;
  }
  const [x,y]=visitorSpots[n%visitorSpots.length],row=Math.floor(n/visitorSpots.length);n++;
  const current=person.username===username&&person.username!=='shenqidayang'&&person.username!=='lqc';
  actors.push({name:person.name,username:person.username,persona:person.persona||'guest',role:null,x:current?800:x+(row%2?28:-28)*Math.min(row,2),y:current?750:y+row*25,direction:'front',appearance:withDefaultFace({...weddingAppearance(null,person.persona),...(person.appearance||{})},person.facePreset,person.appearance)});
 }
 let player=role?actors.find(a=>a.role===role):actors.find(a=>a.username===username);
 if(!player){player={name:username||'我',username,role:null,x:800,y:750,direction:'back',appearance:appearance||weddingAppearance(null,persona)};actors.push(player);}
 Object.assign(player,{player:true,username:username||player.username,persona,appearance:appearance||player.appearance});
 return {actors,player};
}
