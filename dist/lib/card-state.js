export const WIDTH=1200,HEIGHT=760,BASE_HEIGHT=720;
export const PLANTS=[['flower-00','粉色罂粟'],['flower-01','奶油黄罂粟'],['flower-02','莲蓬'],['flower-03','金黄罂粟'],['flower-04','深红罂粟'],['flower-05','青色花苞'],['flower-06','橙色罂粟'],['flower-07','弯曲穗枝'],['flower-08','浅色草穗'],['flower-09','小花苞']];
export const clone=value=>JSON.parse(JSON.stringify(value));
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function defaultBackPlants(){return [{id:'back-flower-00',source:'flower-00',x:1020,y:455,scale:800/720,rotation:0,pitch:0,yaw:0,depth:55,mirror:false}];}
export function defaultCard(){
 const positions=[[7,140,620,.68,-9],[4,305,505,.91,-5],[2,360,665,.55,-4],[1,470,620,.72,5],[3,625,540,.85,3],[7,775,635,.76,13],[5,820,710,.50,7],[0,930,435,1.08,4],[6,1010,635,.72,-6],[8,1100,690,.61,9],[9,1135,740,.45,4],[9,690,750,.44,-5]];
 return {version:2,theme:'light',title:'Gift Card',to:'',from:'',message:'愿你的每一天，\n都有花开，有人爱。',backPlants:defaultBackPlants(),plants:positions.map((p,i)=>({id:'plant-'+i,source:PLANTS[p[0]][0],x:p[1],y:p[2],scale:p[3],rotation:p[4],pitch:0,yaw:0,depth:30+(i%4)*18,mirror:i===0}))};
}
export function validCard(value){
 if(!value||value.version!==2||!['light','dark'].includes(value.theme)||!Array.isArray(value.plants)||value.plants.length>30)return null;
 const strings=['title','to','from','message'];if(strings.some(k=>typeof value[k]!=='string'))return null;
 if(value.title.length>32||value.to.length>40||value.from.length>40||value.message.length>240)return null;
 const groups=[value.plants,value.backPlants===undefined?defaultBackPlants():value.backPlants];
 for(const plants of groups){
  if(!Array.isArray(plants)||plants.length>30||new Set(plants.map(p=>p?.id)).size!==plants.length)return null;
  if(plants.some(p=>!p||typeof p.id!=='string'||!PLANTS.some(x=>x[0]===p.source)||!['x','y','scale','rotation','depth'].every(k=>Number.isFinite(p[k]))||p.scale<.2||p.scale>2||Math.abs(p.x)>2000||Math.abs(p.y)>2000||Math.abs(p.rotation)>180||p.depth<0||p.depth>100))return null;
  if(plants.some(p=>['pitch','yaw'].some(k=>p[k]!==undefined&&(!Number.isFinite(p[k])||Math.abs(p[k])>180))))return null;
 }
 const result=clone(value);result.backPlants=clone(groups[1]);[...result.plants,...result.backPlants].forEach(p=>{p.pitch??=0;p.yaw??=0;});return result;
}
export function boundsOf(p,manifest){
 const [l,t,r,b]=manifest.models[p.source].alphaBounds,w=BASE_HEIGHT*.75*p.scale,h=BASE_HEIGHT*p.scale;
 return {w,h,left:(p.mirror?1-r:l)*w,top:t*h,width:(r-l)*w,height:(b-t)*h};
}
export function hitPlant(p,x,y,alpha){
 const angle=-p.rotation*Math.PI/180,dx=x-p.x,dy=y-p.y;
 const w=BASE_HEIGHT*.75*p.scale,h=BASE_HEIGHT*p.scale;
 let u=(dx*Math.cos(angle)-dy*Math.sin(angle))/w+.5,v=(dx*Math.sin(angle)+dy*Math.cos(angle))/h+.5;
 if(p.mirror)u=1-u;
 if(u<0||u>=1||v<0||v>=1)return false;
 if(!alpha)return true;
 const ix=Math.floor(u*alpha.width),iy=Math.floor(v*alpha.height);
 return alpha.data[(iy*alpha.width+ix)*4+3]>35;
}
export function historyStore(initial){
 let past=[],future=[];
 return {push(previous){past.push(clone(previous));if(past.length>50)past.shift();future=[];},undo(current){if(!past.length)return null;future.push(clone(current));return past.pop();},redo(current){if(!future.length)return null;past.push(clone(current));return future.pop();},get canUndo(){return !!past.length},get canRedo(){return !!future.length}};
}
