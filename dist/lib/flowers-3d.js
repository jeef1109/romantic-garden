import * as THREE from 'three';
import {createButterflies} from './butterflies.js?v=wing-colours-1';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();
const textureCache=new Map();
const textureLoader=new THREE.TextureLoader();
function sourceTexture(source){
 if(!textureCache.has(source)){
  const pending=textureLoader.loadAsync(new URL(`../assets/flowers/${source}.png`,import.meta.url).href).then(texture=>{texture.colorSpace=THREE.SRGBColorSpace;return texture;});
  textureCache.set(source,pending);
 }
 return textureCache.get(source);
}
// The original photograph supplies frontal detail; Tripo supplies geometry,
// side surfaces and its embedded PBR texture. UVs stay fixed to each mesh.
async function preserveFrontDetail(object,bounds,alpha,source){
 const size=bounds.getSize(new THREE.Vector3());
 const texture=await sourceTexture(source);
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.geometry=mesh.geometry.clone();
  const position=mesh.geometry.attributes.position;
  const uv=new Float32Array(position.count*2);const v=new THREE.Vector3(),sourceFront=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld.clone().invert());
  for(let i=0;i<position.count;i++){
   v.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
   uv[i*2]=alpha[0]+(v.x-bounds.min.x)/size.x*(alpha[2]-alpha[0]);
   uv[i*2+1]=1-alpha[3]+(v.y-bounds.min.y)/size.y*(alpha[3]-alpha[1]);
  }
  mesh.geometry.setAttribute('sourceUv',new THREE.BufferAttribute(uv,2));
  const adapt=original=>{
   const material=original.clone();
   material.onBeforeCompile=shader=>{
    shader.uniforms.preserveNativeStem={value:['flower-04','flower-06'].includes(source)?1:0};shader.uniforms.cleanOrangePetals={value:source==='flower-06'?1:0};shader.uniforms.sourcePhoto={value:texture};shader.uniforms.sourceFront={value:sourceFront};shader.uniforms.guardStemProjection={value:['flower-00','flower-01'].includes(source)?1:0};shader.uniforms.guardPetalProjection={value:['flower-00','flower-04','flower-06'].includes(source)?1:0};
    shader.vertexShader='attribute vec2 sourceUv; uniform vec3 sourceFront; varying float vSourceFacing; varying vec2 vSourceUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvSourceUv = sourceUv; vSourceFacing = normalize(mat3(modelViewMatrix) * sourceFront).z;');
    shader.fragmentShader='uniform float preserveNativeStem; uniform float cleanOrangePetals; uniform sampler2D sourcePhoto; uniform float guardStemProjection; uniform float guardPetalProjection; varying float vSourceFacing; varying vec2 vSourceUv;\n'+shader.fragmentShader;
    // Remove grey/brown colour contamination baked into orange petal UV islands.
    // Preserve the green centre/stem and retain the native surface relief.
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float orangePetalRegion = smoothstep(0.63, 0.72, vSourceUv.y);
      float warmPetal = smoothstep(1.15, 1.8, diffuseColor.r / max(diffuseColor.g, 0.001));
      float greyPetal = smoothstep(0.035, 0.18, diffuseColor.b / max(diffuseColor.r, 0.001));
      float repairWeight = cleanOrangePetals * orangePetalRegion * warmPetal * greyPetal;
      vec3 cleanPetal = vec3(diffuseColor.r * 1.22, diffuseColor.g * 0.85, diffuseColor.b * 0.20);
      diffuseColor.rgb = mix(diffuseColor.rgb, cleanPetal, repairWeight);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',
     `vec4 sourceDetail = texture2D(sourcePhoto, vSourceUv);
      float sourcePetal = smoothstep(1.15, 1.8, sourceDetail.r / max(sourceDetail.g, 0.001));
      // At the pink/cream junction, the photograph and mesh stems are offset.
      // Keep native material where projection crosses from stem to petal;
      // keep native green stems when petals in the source overlap them.
      float sourceStem = step(sourceDetail.r * 1.12, sourceDetail.g) * step(sourceDetail.b * 1.5, sourceDetail.g);
      float nativeStem = step(diffuseColor.r * 1.10, diffuseColor.g);
      float junction = step(0.60, vSourceUv.y) * step(vSourceUv.y, 0.78);
      float crossedSurface = guardStemProjection * sourceStem * (1.0-nativeStem) + guardPetalProjection * nativeStem * (1.0-sourceStem);
      // Keep the complete red/orange stem in one native material, avoiding a seam
      // where the projected petal ends and the source photograph's stem starts.
      float nativeStemSurface = preserveNativeStem * nativeStem * (1.0-smoothstep(0.76, 0.80, vSourceUv.y));
      float projectionValid = (1.0 - crossedSurface * junction) * (1.0-nativeStemSurface);
      float frontDetail = projectionValid * sourceDetail.a * smoothstep(0.0, 0.75, vSourceFacing) * mix(smoothstep(0.1, 0.65, normal.z), 1.0, cleanOrangePetals * smoothstep(0.80, 0.87, vSourceUv.y) * warmPetal * sourcePetal) * 0.92;
      outgoingLight = mix(outgoingLight, sourceDetail.rgb, frontDetail);
      #include <opaque_fragment>`);
   };
   material.customProgramCacheKey=()=> 'source-detail-v7-stems';
   return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(adapt):adapt(mesh.material);
 });
}
const loadModel = file => {
  if (!cache.has(file)) cache.set(file,loader.loadAsync(new URL(`../assets/models/${file}`,import.meta.url).href));
  return cache.get(file);
};
export function createFlowerScene(container,manifest,{onReady=()=>{},onError=()=>{},active=true}={}){
 const W=1200,H=760;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
 renderer.setPixelRatio(1.5);renderer.setSize(W,H,false);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.domElement.className='flower-canvas';renderer.domElement.setAttribute('aria-hidden','true');container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,W,H,0,1,6000);camera.position.set(0,0,4500);camera.lookAt(0,0,0);
 scene.add(new THREE.AmbientLight(0xffffff,2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(-500,1300,2000);scene.add(key);const fill=new THREE.DirectionalLight(0xfff9f0,.6);fill.position.set(700,400,-1000);scene.add(fill);
 const visitors=createButterflies(scene,{onLoad:()=>draw()}),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let enabled=active,frame=0,lastTime=0,elapsed=0,disturbed=null;
 let plants=[],tilt={x:0,y:0},disposed=false;const instances=new Map(),pending=new Set(),templates=new Map();
 async function template(source){
  if(!templates.has(source))templates.set(source,(async()=>{
   const model=manifest.models[source],gltf=await loadModel(model.file),object=gltf.scene.clone(true);object.rotation.set(...model.rotation);object.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   let landing=null;
   if(['flower-00','flower-01','flower-03','flower-04','flower-06'].includes(source)){
    const probe=new THREE.Raycaster(),down=new THREE.Vector3(0,0,-1);
    for(const offset of [0,-.05,.05]){
     probe.set(new THREE.Vector3(center.x+size.x*offset,bounds.max.y-size.y*.17,bounds.max.z+size.z+1),down);
     const hit=probe.intersectObject(object,true)[0];if(hit){landing={point:hit.point.clone().sub(center),normal:hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))};break;}
    }
   }
   await preserveFrontDetail(object,bounds,model.alphaBounds,source);object.position.sub(center);
   return {object,size,alpha:model.alphaBounds,landing};
  })());return templates.get(source);
 }
 function place(){
  for(let i=0;i<plants.length;i++){
   const p=plants[i],item=instances.get(p.id);if(!item)continue;
   const {alpha,size,fit,pivot,orientation}=item;const w=540*p.scale,h=720*p.scale;
   const sx=w*(alpha[2]-alpha[0])/size.x,sy=h*(alpha[3]-alpha[1])/size.y;
   fit.scale.set(sx*(p.mirror?-1:1),sy,Math.sqrt(sx*sy));
   orientation.position.set((((alpha[0]+alpha[2])/2)-.5)*w*(p.mirror?-1:1),(.5-(alpha[1]+alpha[3])/2)*h,0);
   orientation.rotation.set((p.pitch||0)*Math.PI/180,(p.yaw||0)*Math.PI/180,0,'YXZ');
   pivot.position.set(p.x+tilt.x*p.depth*.18,H-p.y-tilt.y*p.depth*.18,100+i*110);
   pivot.rotation.set(-tilt.y*.055,tilt.x*.08,-p.rotation*Math.PI/180);
  }
 }
 function anchors(){
  scene.updateMatrixWorld(true);const result=[];
  for(const [id,item] of instances){if(!item.landing)continue;const point=item.fit.localToWorld(item.landing.point.clone());
   if(point.x<15||point.x>W-15||point.y<15||point.y>H-15)continue;
   const normal=item.landing.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(item.fit.matrixWorld));
   result.push({id,position:point,normal});
  }return result;
 }
 function draw(next=tilt){if(disposed)return;tilt=next;place();visitors.update(0,elapsed,anchors(),{reduced:reduced.matches,disturbed});renderer.render(scene,camera);}
 function tick(time){
  frame=0;if(disposed||!enabled||document.hidden||reduced.matches)return;
  if(lastTime&&time-lastTime<1000/30){frame=requestAnimationFrame(tick);return;}
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):1/30;lastTime=time;elapsed+=dt;
  place();visitors.update(dt,elapsed,anchors(),{disturbed});renderer.render(scene,camera);frame=requestAnimationFrame(tick);
 }
 function schedule(){if(!frame&&enabled&&!disposed&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);}
 function setActive(value){enabled=value;cancelAnimationFrame(frame);frame=0;lastTime=0;if(enabled){draw();schedule();}}
 const visibilityChanged=()=>{lastTime=0;cancelAnimationFrame(frame);frame=0;schedule();};
 const motionChanged=()=>setActive(enabled);
 document.addEventListener('visibilitychange',visibilityChanged);reduced.addEventListener('change',motionChanged);schedule();
 function setPlants(next){
  plants=next.map(p=>({...p}));
  for(const [id,item] of instances)if(!plants.some(p=>p.id===id)){scene.remove(item.pivot);instances.delete(id);}
  for(const p of plants){if(instances.has(p.id)||pending.has(p.id))continue;pending.add(p.id);
   template(p.source).then(t=>{
    if(disposed||!plants.some(q=>q.id===p.id))return;
    const pivot=new THREE.Group(),orientation=new THREE.Group(),fit=new THREE.Group();pivot.userData.plantId=p.id;fit.add(t.object.clone(true));orientation.add(fit);pivot.add(orientation);scene.add(pivot);instances.set(p.id,{...t,pivot,orientation,fit});draw();onReady(p.id);
   }).catch(error=>onError(p.id,error)).finally(()=>pending.delete(p.id));
  }draw();
 }
 async function ready(){await Promise.allSettled([...templates.values()]);return plants.every(p=>instances.has(p.id));}
 function snapshot(){draw({x:0,y:0});return renderer.domElement;}
 function layers(){
  const result=[];visitors.visible=false;draw({x:0,y:0});
  for(const p of plants){for(const [id,item] of instances)item.pivot.visible=id===p.id;renderer.render(scene,camera);result.push({id:p.id,depth:p.depth,url:renderer.domElement.toDataURL('image/png')});}
  for(const item of instances.values())item.pivot.visible=true;visitors.visible=true;draw();return result;
 }
 const raycaster=new THREE.Raycaster();
 function pick(x,y){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2(x/W*2-1,1-y/H*2),camera);
  const hit=raycaster.intersectObjects([...instances.values()].map(item=>item.pivot),true)[0];if(!hit)return null;
  let object=hit.object;while(object&&!object.userData.plantId)object=object.parent;return object?.userData.plantId||null;
 }
 function bounds(id){
  const item=instances.get(id);if(!item)return null;scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(item.pivot);return {left:box.min.x,top:H-box.max.y,width:Math.max(20,box.max.x-box.min.x),height:Math.max(20,box.max.y-box.min.y)};
 }
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onError(null,new Error('WebGL context lost'));});
 return {setPlants,draw,ready,snapshot,layers,pick,bounds,setActive,disturb(id){disturbed=id;},loaded:id=>instances.has(id),get count(){return instances.size},dispose(){disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibilityChanged);reduced.removeEventListener('change',motionChanged);visitors.dispose();renderer.dispose();renderer.domElement.remove();}};
}
