// Rebuild generated assets from this repository; no artifacts/ downloads needed.
const path=require('node:path'),{spawnSync}=require('node:child_process');
const steps=[
 ['build-wedding-character-assets.cjs'],
 ['build-wedding-juggler.cjs'],
 ['build-wedding-cat-actions.cjs'],
 ['build-animal-backs.cjs'],
 ['build-emoji-backs.cjs'],
 ['curate-wedding-emojis.cjs'],
 ['organize-wedding-props.cjs'],
 ['optimize-images.cjs','--prune'],
 ['optimize-images.cjs','--check'],
];
for(const [script,...args]of steps){
 const result=spawnSync(process.execPath,[path.join(__dirname,script),...args],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
