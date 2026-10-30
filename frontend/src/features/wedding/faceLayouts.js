// Independent feature IDs and native-pixel anchors; no flattened face textures.
export const facePresets = [
  { id: "face-completes-face1", name: "face1", label: "\u642d\u914d 1", eyes: "face-eyes-eyebrown-large", eyebrows: "face-eyebrows-blackbrow1", mouth: "face-mouth-mouth-happy", nose: "1",
    points: [[-30,-451.5],[30,-444.5],[-33.5,-413.5],[28.5,-413.5],[-3.5,-394.5],[7.5,-365.5]] },
  { id: "face-completes-face2", name: "face2", label: "\u642d\u914d 2", eyes: "face-eyes-eyepine-large", eyebrows: "face-eyebrows-brown1brow1", mouth: "face-mouth-mouth-teethlower", nose: "2" },
  { id: "face-completes-face3", name: "face3", label: "\u642d\u914d 3", eyes: "face-eyes-eyeblack-small", eyebrows: "face-eyebrows-blondebrow1", mouth: "face-mouth-mouth-straight", nose: "3" },
  { id: "face-completes-face4", name: "face4", label: "\u642d\u914d 4", eyes: "face-eyes-eyeblack-large", eyebrows: "face-eyebrows-blackbrow1", mouth: "face-mouth-mouth-glad", nose: "1" },
];
const standardPoints = [[-32,-450],[32,-450],[-32,-414],[32,-414],[0,-395],[0,-366]];
export function presetAppearance(a, preset) {
  return {...a, face:preset.id, faceLayout:preset.id, eyes:preset.eyes, eyebrows:preset.eyebrows, mouth:preset.mouth, nose:preset.nose};
}
export function drawFace(ctx, images, parts, a, pose = {}) {
  const preset = facePresets.find(p=>p.id===a.faceLayout) || facePresets[0];
  const points = preset.points || standardPoints;
  const keys = ["eyebrows","eyebrows","eyes","eyes","nose","mouth"];
  for(let i=0;i<keys.length;i++) {
    const key=keys[i], part=parts[key], image=images.get(part.id);
    if(!image) continue;
    const [x,y]=points[i];
    ctx.save();ctx.translate(x,y);
    if(i===1)ctx.scale(-1,1);
    // Animation can transform eyes/mouth independently without replacing a face.
    const scale=key==='eyes' ? (pose.eyeOpen ?? 1) : key==='mouth' ? (pose.mouthScale ?? 1) : 1;
    ctx.scale(1,Math.max(.08,Math.min(2,scale)));
    ctx.drawImage(image,-part.width/2,-part.height/2);ctx.restore();
  }
}
