import * as THREE from 'three';

// All 19 original frames from the user's Framer GIF, with alpha preserved.
// Atlas padding and UV inset keep neighbouring frames from bleeding at small sizes.
const atlasInfo={frames:19,columns:5,tileWidth:260,tileHeight:310,width:1300,height:1240,frameWidth:256,frameHeight:306,padding:2,duration:.06};
const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const smooth=n=>n*n*(3-2*n);
export function createButterflies(scene,{texture:providedTexture=null,onLoad=()=>{}}={}){
 const root=new THREE.Group();root.name='Garden visitors';scene.add(root);
 const resources=[],visitors=[],zAxis=new THREE.Vector3(0,0,1),q=new THREE.Quaternion(),restQ=new THREE.Quaternion(),identity=new THREE.Quaternion();
 let loaded=!!providedTexture,disposed=false;
 const atlas=providedTexture||new THREE.TextureLoader().load(new URL('../assets/butterflies/blue-butterfly-atlas.png',import.meta.url).href,()=>{if(disposed)return;loaded=true;visitors.forEach(b=>{b.map.needsUpdate=true;});onLoad();},undefined,error=>console.warn('蝴蝶素材未加载',error));
 atlas.colorSpace=THREE.SRGBColorSpace;atlas.generateMipmaps=false;atlas.minFilter=THREE.LinearFilter;atlas.magFilter=THREE.LinearFilter;
 function poseFrame(b,index){
  const a=atlasInfo,col=index%a.columns,row=Math.floor(index/a.columns);
  b.map.repeat.set((a.frameWidth-1)/a.width,(a.frameHeight-1)/a.height);
  b.map.offset.set((col*a.tileWidth+a.padding+.5)/a.width,1-(row*a.tileHeight+a.padding+a.frameHeight-.5)/a.height);
 }
 for(let i=0;i<3;i++){
  const group=new THREE.Group(),size=[68,46,56][i];root.add(group);group.scale.setScalar(size);group.visible=false;
  const map=atlas.clone();map.needsUpdate=loaded;
  const material=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,alphaTest:.12,transparent:false});
  // Recolour only the blue wing pigment; keep white spots, dark veins and body.
  const wingTint=new THREE.Color([0xffffff,0xd970e5,0xffb13b][i]);
  material.onBeforeCompile=shader=>{
   shader.uniforms.wingTint={value:wingTint};shader.uniforms.wingTintStrength={value:i===0?0:1};
   shader.fragmentShader='uniform vec3 wingTint; uniform float wingTintStrength;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float bluePigment = smoothstep(0.025, 0.18, diffuseColor.b - diffuseColor.r)
      * smoothstep(0.0, 0.13, diffuseColor.b - diffuseColor.g * 0.7);
    vec3 luminanceWeights = vec3(0.2126, 0.7152, 0.0722);
    float wingLuminance = dot(diffuseColor.rgb, luminanceWeights);
    vec3 tintedWing = wingTint * wingLuminance / max(dot(wingTint, luminanceWeights), 0.01);
    diffuseColor.rgb = mix(diffuseColor.rgb, tintedWing, bluePigment * wingTintStrength);
   `);
  };
  material.customProgramCacheKey=()=> 'butterfly-wing-colours-v1';
  const geometry=new THREE.PlaneGeometry(450/537,1);geometry.translate(0,.12,0);group.add(new THREE.Mesh(geometry,material));resources.push(material,geometry,map);
  const b={group,map,size,state:'waiting',clock:0,delay:i*1.2,target:null,trip:0,duration:3,serial:i*9,phase:i*2.1,wingTime:i*.27,from:new THREE.Vector3(),control1:new THREE.Vector3(),control2:new THREE.Vector3(),previous:new THREE.Vector3(),heading:0};visitors.push(b);poseFrame(b,Math.floor(i*5));
 }
 function landingRotation(b,a){restQ.setFromUnitVectors(zAxis,a.normal).slerp(identity,.65);q.setFromAxisAngle(zAxis,(random(b.serial+5)-.5)*1.3);return restQ.multiply(q);}
 function choose(anchors,b){
  const occupied=new Set(visitors.filter(v=>v!==b&&v.state!=='waiting').map(v=>v.target));
  let candidates=anchors.filter(a=>!occupied.has(a.id));if(candidates.length>1)candidates=candidates.filter(a=>a.id!==b.target);if(!candidates.length)candidates=anchors;
  return candidates[Math.floor(random(++b.serial)*candidates.length)];
 }
 function depart(b,a){
  b.target=a.id;b.state='flying';b.clock=0;b.trip=0;
  if(!b.group.visible){b.group.position.set(b.serial%2?-70:1270,600+random(b.serial)*130,a.position.z+140);b.group.visible=true;}
  b.from.copy(b.group.position);const delta=a.position.clone().sub(b.from);b.duration=2.3+Math.min(1.8,delta.length()/450);
  b.control1.copy(b.from).addScaledVector(delta,.25).add(new THREE.Vector3((random(b.serial+1)-.5)*150,100+random(b.serial+2)*90,90));
  b.control2.copy(a.position).add(new THREE.Vector3((random(b.serial+3)-.5)*130,95,70));b.previous.copy(b.from);
 }
 function perchPose(b,a){landingRotation(b,a);b.group.position.copy(a.position).addScaledVector(a.normal,3);b.group.quaternion.copy(restQ);}
 function update(dt,time,anchors,{reduced=false,disturbed=null}={}){
  for(const [index,b] of visitors.entries()){
   if(!loaded){b.group.visible=false;continue;}
   if(index>=anchors.length){b.group.visible=false;b.target=null;b.state='waiting';b.clock=0;continue;}
   let a=anchors.find(a=>a.id===b.target);
   if(!anchors.length){b.group.visible=false;b.target=null;b.state='waiting';b.clock=0;continue;}
   if(reduced){if(!a){a=choose(anchors,b);b.target=a.id;}b.group.visible=true;perchPose(b,a);poseFrame(b,7);continue;}
   b.clock+=dt;
   if(b.state==='waiting'&&b.clock<b.delay)continue;
   if(!a||b.state==='waiting'||(b.state==='perched'&&(b.clock>3+random(b.serial+4)*4||a.id===disturbed))){const next=choose(anchors,b);depart(b,next);a=next;}
   
   if(b.state==='flying'){
    b.trip+=dt;const t=Math.min(1,b.trip/b.duration),u=smooth(t),v=1-u;
    b.group.position.copy(b.from).multiplyScalar(v*v*v).addScaledVector(b.control1,3*v*v*u).addScaledVector(b.control2,3*v*u*u).addScaledVector(a.position,u*u*u);
    const flutter=Math.sin(Math.PI*t);b.group.position.x+=Math.sin(time*2.1+b.phase)*9*flutter;b.group.position.y+=Math.sin(time*3.6+b.phase)*8*flutter;b.group.position.z+=25*flutter;
    const dx=b.group.position.x-b.previous.x,dy=b.group.position.y-b.previous.y;const angle=Math.hypot(dx,dy)>.001?Math.atan2(-dx,dy):b.heading;b.heading+=Math.atan2(Math.sin(angle-b.heading),Math.cos(angle-b.heading))*Math.min(1,dt*5);
    q.setFromEuler(new THREE.Euler(-.32+Math.sin(time*1.4+b.phase)*.17,Math.sin(time*2+b.phase)*.25,b.heading+1.05,'ZYX'));b.group.quaternion.slerp(q,Math.min(1,dt*8));
    b.previous.copy(b.group.position);
    if(t===1){b.state='hovering';b.clock=0;}
   }else if(b.state==='hovering'){
    const t=Math.min(1,b.clock/1.15),radius=18*(1-smooth(t));
    b.group.position.copy(a.position).add(new THREE.Vector3(Math.sin(time*4+b.phase)*radius,12*(1-t)+Math.cos(time*3)*radius*.45,18*(1-t)+3));
    landingRotation(b,a);b.group.quaternion.slerp(restQ,Math.min(1,dt*4));
    if(t===1){b.state='perched';b.clock=0;}
   }else{perchPose(b,a);}
   b.wingTime+=dt*(b.state==='perched'?.3:b.state==='hovering'?1.25:1.8);poseFrame(b,Math.floor(b.wingTime/atlasInfo.duration)%atlasInfo.frames);
  }
 }
 return {update,set visible(v){root.visible=v;},get visible(){return root.visible;},dispose(){disposed=true;root.removeFromParent();resources.forEach(r=>r.dispose());if(!providedTexture)atlas.dispose();}};
}
