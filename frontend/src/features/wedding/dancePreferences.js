import {danceFor,initialDance} from './choreography';
const key=user=>`wedding-dance-preferences:${user||'guest'}`;
export function loadDancePreferences(storage,user){try{const saved=JSON.parse(storage.getItem(key(user))||'null');return {dance:danceFor(saved?.dance)?.id||initialDance,emoji:saved?.emoji!==false};}catch{return {dance:initialDance,emoji:true};}}
export function saveDancePreferences(storage,user,value){try{storage.setItem(key(user),JSON.stringify({dance:danceFor(value.dance)?.id||initialDance,emoji:value.emoji!==false}));return true;}catch{return false;}}
