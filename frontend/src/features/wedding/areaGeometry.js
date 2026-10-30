const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const onSegment=(a,b,p)=>Math.abs(orient(a,b,p))<1e-7&&p[0]>=Math.min(a[0],b[0])-1e-7&&p[0]<=Math.max(a[0],b[0])+1e-7&&p[1]>=Math.min(a[1],b[1])-1e-7&&p[1]<=Math.max(a[1],b[1])+1e-7;
const intersect=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);
export function areaError(area){
 if(!area||!Number.isFinite(area.width)||!Number.isFinite(area.height)||area.width<=0||area.height<=0||area.width>20000||area.height>20000)return '底图尺寸无效';
 if(!area.world||!Number.isFinite(area.world.width)||!Number.isFinite(area.world.height)||area.world.width<=0||area.world.height<=0)return '场景尺寸无效';
 if(!Array.isArray(area.points)||area.points.length<3||area.points.length>200)return '边界需要 3–200 个点';
 const p=area.points,n=p.length;
 if(p.some(a=>!Array.isArray(a)||a.length!==2||a.some(v=>!Number.isFinite(v))||a[0]<0||a[0]>area.width||a[1]<0||a[1]>area.height))return '点位必须位于底图内';
 for(let i=0;i<n;i++){
  const a=p[i],b=p[(i+1)%n];
  if(Math.hypot(a[0]-b[0],a[1]-b[1])<.01)return '相邻点不能重合';
  for(let j=i+1;j<n;j++)if(j!==i+1&&!(i===0&&j===n-1)&&intersect(a,b,p[j],p[(j+1)%n]))return '边界不能交叉或重叠';
 }
 if(Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%n];return sum+a[0]*b[1]-b[0]*a[1];},0))<1)return '边界面积太小';
 return '';
}
