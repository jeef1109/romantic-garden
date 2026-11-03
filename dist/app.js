import {setupCardSharing} from './lib/card-share.js?v=share-links-1';
import {WIDTH,HEIGHT,BASE_HEIGHT,PLANTS,clone,clamp,defaultCard,defaultBackPlants,validCard,boundsOf,hitPlant,historyStore} from './lib/card-state.js?v=two-sided-edit-1';
import {attachCardRotation} from './lib/card-rotation.js?v=drag-flip-1';
import {attachCardMotion} from './lib/card-motion.js';
import {exportPNG,exportInteractive,renderCard,downloadBlob} from './lib/card-export.js?v=romantic-garden-1';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)],STORAGE='budarina-card-studio-v2';
const manifest=await fetch('./assets/models/manifest.json?v=petal-repair-1').then(r=>r.json());
let state=defaultCard();try{state=validCard(JSON.parse(localStorage.getItem(STORAGE)))||state;}catch{}
let dragMode='move',editSide='front';
const plantKey=()=>editSide==='back'?'backPlants':'plants',plants=()=>state[plantKey()];
const scenes={front:null,back:null},photoMaps={front:new Map(),back:new Map()};
let step='arrange',selected=null,scene=null,flipped=false,boardScale=1,drag=null,rangeStart=null,textStart=null,toastTimer=0,backVersion=0;
const history=historyStore(state),sourceImages=new Map(),alphaMaps=new Map(),cardSize=$('#card-size');
let board=$('#board');
const labelOf=source=>PLANTS.find(p=>p[0]===source)?.[1]||'植物';
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));$('#save-state').textContent='已保存在本机';}catch{$('#save-state').textContent='浏览器未允许保存，请导出卡片';}}
function change(fn,message){history.push(state);fn();render();save();if(message)toast(message);}
function select(id){selected=id;updateSelection();}
function updateSelection(){
 const p=plants().find(p=>p.id===selected);document.body.classList.toggle('plant-selected',!!p);$('#selection-empty').hidden=!!p;$('#selection-controls').hidden=!p;
 const box=$('#selection');box.hidden=!p||step!=='arrange';if(!p)return;
 const b=boundsOf(p,manifest),r=p.rotation*Math.PI/180,bx=b.left-b.w/2,by=b.top-b.h/2;
 Object.assign(box.style,{width:b.width+'px',height:b.height+'px',transform:`translate(${p.x+Math.cos(r)*bx-Math.sin(r)*by}px,${p.y+Math.sin(r)*bx+Math.cos(r)*by}px) rotate(${p.rotation}deg)`});
 const projected=scene?.bounds(p.id);if(projected)Object.assign(box.style,{width:projected.width+'px',height:projected.height+'px',transform:`translate(${projected.left}px,${projected.top}px)`});
 const ready=!!scene?.loaded(p.id);for(const id of ['#plant-pitch','#plant-yaw','#mode-orbit'])$(id).disabled=!ready;
 $('#orientation-status').textContent=ready?'选择「立体旋转」后拖动花朵，或用三轴滑块微调。':'3D 模型加载中；加载完成后可调整立体朝向。';
 for(const axis of ['pitch','yaw']){if(document.activeElement!==$('#plant-'+axis))$('#plant-'+axis).value=Math.round(p[axis]||0);$('#'+axis+'-value').textContent=Math.round(p[axis]||0)+'°';}
 box.querySelector('.selection-name').textContent=labelOf(p.source);$('#selected-name').textContent=labelOf(p.source);
 if(document.activeElement!==$('#plant-size'))$('#plant-size').value=Math.round(p.scale*100);
 if(document.activeElement!==$('#plant-rotation'))$('#plant-rotation').value=Math.round(p.rotation);
 if(document.activeElement!==$('#plant-depth'))$('#plant-depth').value=p.depth;
 $('#size-value').textContent=Math.round(p.scale*100)+'%';$('#rotation-value').textContent=Math.round(p.rotation)+'°';$('#depth-value').textContent=Math.round(p.depth);
 $('#bring-forward').disabled=plants().indexOf(p)===plants().length-1;$('#send-backward').disabled=plants().indexOf(p)===0;
}
function renderPlants(){
 for(const side of ['front','back']){
  const list=side==='front'?state.plants:state.backPlants,photos=photoMaps[side],view=scenes[side];
  for(const [id,img] of photos)if(!list.some(p=>p.id===id)){img.remove();photos.delete(id);}
  for(const p of list){
   let img=photos.get(p.id);if(!img){img=new Image();img.src=`./assets/flowers/${p.source}.png`;img.className='plant-photo';img.alt='';img.draggable=false;photos.set(p.id,img);}
   img.style.transform=`translate(${p.x-270}px,${p.y-360}px) rotate(${p.rotation}deg) scale(${p.scale*(p.mirror?-1:1)},${p.scale})`;
   img.style.visibility=view?.loaded(p.id)?'hidden':'visible';$(side==='front'?'#photo-layer':'#back-photo-layer').append(img);
  }
  view?.setPlants(list);
 }
 $('#plant-count').textContent=(editSide==='front'?'正面 ':'背面 ')+plants().length+' / 30 株';updateSelection();
}
function setEditSide(side){
 if(drag)finishDrag({pointerId:drag.pointerId});
 editSide=side;selected=null;scene=scenes[side];board=$(side==='front'?'#board':'#back-board');board.append($('#selection'));board.dataset.dragMode=dragMode;
 document.body.dataset.editSide=side;flipped=side==='back';activateScenes();$('#flipper').classList.toggle('flipped',flipped);
 for(const face of ['front','back'])$('#edit-'+face).setAttribute('aria-pressed',String(face===side));
 $('#reset').textContent=side==='back'?'恢复背面':'恢复正面';renderPlants();
}
$('#edit-front').onclick=()=>setEditSide('front');$('#edit-back').onclick=()=>setEditSide('back');
$('#edit-back-flowers').onclick=()=>{goTo('arrange');setEditSide('back');};

function render(){
 const version=++backVersion;renderCard(clone(state),null,'back',{border:false}).then(canvas=>{if(version===backVersion){$('#back-render').src=canvas.toDataURL();$('#back-render').alt='送给'+(state.to||'你')+'：'+state.message+' — '+(state.from||'我');}});
 document.body.dataset.theme=state.theme;$('#light-theme').setAttribute('aria-pressed',String(state.theme==='light'));$('#dark-theme').setAttribute('aria-pressed',String(state.theme==='dark'));
 $('#card-title').textContent=state.title||'Gift Card';$('#card-title').style.fontSize=(state.title.length>14?Math.max(75,200*14/state.title.length):200)+'px';
 for(const [selector,key] of [['#card-heading','title'],['#recipient','to'],['#sender','from'],['#message','message']])if(document.activeElement!==$(selector))$(selector).value=state[key];
 $('#message-count').textContent=state.message.length+' / 240';$('#undo').disabled=!history.canUndo;$('#redo').disabled=!history.canRedo;renderPlants();
}
function resize(){
 const available=$('.canvas-area').clientWidth;
 const arranging=step==='arrange';
 const maxWidth=arranging?Math.min(innerWidth-32,Math.max(260,innerHeight-108)*WIDTH/HEIGHT):step==='write'?760:790;
 boardScale=Math.min(available,maxWidth)/WIDTH;cardSize.style.width=WIDTH*boardScale+'px';cardSize.style.height=HEIGHT*boardScale+'px';for(const el of [$('#board'),$('#back-board')]){el.style.transform=`scale(${boardScale})`;el.style.setProperty('--board-scale',boardScale);}

}
function activateScenes(){scenes.front?.setActive(!flipped);scenes.back?.setActive(flipped);}
function goTo(next){
 cardSize.classList.remove('drag-outside');
 const old=cardSize.getBoundingClientRect();step=next;document.body.dataset.step=step;flipped=step==='write'||(step==='arrange'&&editSide==='back');$('#flipper').classList.toggle('flipped',flipped);cardRotation.reset(flipped);cardSize.tabIndex=step==='preview'?0:-1;activateScenes();
 $('#toggle-library').hidden=step!=='arrange';document.body.classList.remove('library-open');$('#toggle-library').setAttribute('aria-expanded','false');$('#side-control').hidden=step!=='arrange';$('#inspector').hidden=step!=='arrange';$('#plant-tray').hidden=step!=='arrange';$('#message-panel').hidden=step!=='write';$('#edit-actions').hidden=step!=='arrange';$('#previous-step').hidden=step==='arrange';$('#flip-card').hidden=step!=='preview';
 $('#next-step').innerHTML=step==='arrange'?'写下祝福 <span>↗</span>':step==='write'?'预览卡片 <span>↗</span>':'分享卡片 <span>↗</span>';
 $('#previous-step').textContent=step==='write'?'← 返回布置':'← 修改祝福';$('#flip-card').textContent='翻到背面 ↻';
 const content={arrange:['A LITTLE GARDEN, MADE BY YOU','选一朵喜欢的花，放在属于它的位置。','拖动花朵 · 拖拽角点缩放 · 顶部圆点旋转'],write:['WORDS THAT BLOOM','让花，替你送上一点心意。','这就是 TA 将收到的祝福。'],preview:['SOMETHING BEAUTIFUL TO KEEP','你的心意，已经盛开。','按住卡片左右拖动，转到背面读祝福']};
 $('#step-eyebrow').textContent=content[step][0];$('#step-description').textContent=content[step][1];$('#canvas-hint').textContent=content[step][2];
 $$('.steps button').forEach(b=>{if(b.dataset.step===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 $('#card-title').style.translate='none';$('#tilt-shell').style.transform='none';Object.values(scenes).forEach(s=>s?.draw({x:0,y:0}));updateSelection();resize();
 if(!matchMedia('(prefers-reduced-motion:reduce)').matches){const now=cardSize.getBoundingClientRect();cardSize.animate([{transform:`translate(${old.left-now.left}px,${old.top-now.top}px) scale(${old.width/now.width})`},{transform:'none'}],{duration:280,easing:'cubic-bezier(.23,1,.32,1)',transformOrigin:'top left'});}
}
for(const [source,name] of PLANTS){
 const b=document.createElement('button');b.className='plant-option';b.setAttribute('aria-label','添加'+name);b.innerHTML=`<img src="./assets/flowers/${source}.png" alt="" draggable="false"><span>${name}</span><b>＋</b>`;
 b.onclick=()=>{if(plants().length>=30){toast('最多放置 30 株植物');return;}change(()=>{const p={id:crypto.randomUUID(),source,x:600,y:530,scale:.8,rotation:0,pitch:0,yaw:0,depth:55,mirror:false};plants().push(p);selected=p.id;},'添了一株'+name);setLibrary(false);};$('#plant-library').append(b);
}
function setLibrary(open){document.body.classList.toggle('library-open',open);$('#toggle-library').setAttribute('aria-expanded',String(open));}
$('#toggle-library').onclick=()=>setLibrary(!document.body.classList.contains('library-open'));$('#close-library').onclick=()=>setLibrary(false);
$('#light-theme').onclick=()=>{if(state.theme!=='light')change(()=>state.theme='light');};$('#dark-theme').onclick=()=>{if(state.theme!=='dark')change(()=>state.theme='dark');};
$$('.steps button').forEach(b=>b.onclick=()=>goTo(b.dataset.step));$('#next-step').onclick=()=>{if(step==='arrange')goTo('write');else if(step==='write')goTo('preview');else{$('#export-status').textContent='';$('#export-dialog').showModal();cardSharing.open(clone(state));}};$('#previous-step').onclick=()=>goTo(step==='preview'?'write':'arrange');$('#flip-card').onclick=()=>cardRotation.flip();
$('#close-export').onclick=()=>$('#export-dialog').close();$('#export-dialog').addEventListener('click',e=>{if(e.target===$('#export-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#deselect').onclick=()=>select(null);
for(const [selector,key,factor] of [['#plant-size','scale',.01],['#plant-rotation','rotation',1],['#plant-pitch','pitch',1],['#plant-yaw','yaw',1],['#plant-depth','depth',1]]){
 $(selector).addEventListener('input',e=>{const p=plants().find(p=>p.id===selected);if(!p)return;if(!rangeStart)rangeStart=clone(state);p[key]=Number(e.target.value)*factor;renderPlants();});
 $(selector).addEventListener('change',()=>{if(rangeStart){history.push(rangeStart);rangeStart=null;render();save();}});
}
const chosen=()=>plants().find(p=>p.id===selected);
for(const mode of ['move','orbit'])$('#mode-'+mode).onclick=()=>{dragMode=mode;board.dataset.dragMode=mode;$('#mode-move').setAttribute('aria-pressed',String(mode==='move'));$('#mode-orbit').setAttribute('aria-pressed',String(mode==='orbit'));};
$('#reset-orientation').onclick=()=>{if(chosen())change(()=>Object.assign(chosen(),{pitch:0,yaw:0,rotation:0}),'已恢复正面角度');};
$('#duplicate-plant').onclick=()=>{const p=chosen();if(!p)return;if(plants().length>=30){toast('最多放置 30 株植物');return;}change(()=>{const q={...p,id:crypto.randomUUID(),x:clamp(p.x+45,0,WIDTH),y:p.y+10};plants().push(q);selected=q.id;},'已复制植物');};
function deleteSelected(){if(!chosen())return;change(()=>{state[plantKey()]=plants().filter(p=>p.id!==selected);selected=null;},'已删除这株植物，可点击撤销恢复');}
$('#delete-plant').onclick=deleteSelected;
$('#mirror-plant').onclick=()=>{if(chosen())change(()=>chosen().mirror=!chosen().mirror);};
for(const [selector,delta] of [['#bring-forward',1],['#send-backward',-1]])$(selector).onclick=()=>{const i=plants().findIndex(p=>p.id===selected),j=i+delta;if(i<0||j<0||j>=plants().length)return;change(()=>{[plants()[i],plants()[j]]=[plants()[j],plants()[i]];});};
function undo(){const value=history.undo(state);if(value){state=value;selected=null;render();save();}}function redo(){const value=history.redo(state);if(value){state=value;selected=null;render();save();}}
$('#undo').onclick=undo;$('#redo').onclick=redo;$('#reset').onclick=()=>change(()=>{state[plantKey()]=editSide==='back'?defaultBackPlants():defaultCard().plants;selected=null;},'当前面的花园已恢复，祝福保留');
for(const [selector,key] of [['#card-heading','title'],['#recipient','to'],['#sender','from'],['#message','message']]){
 $(selector).addEventListener('focus',()=>textStart=clone(state));$(selector).addEventListener('input',e=>{state[key]=e.target.value;render();save();});$(selector).addEventListener('change',()=>{if(textStart){history.push(textStart);textStart=null;render();}});
}
function updateCardBoundary(point){cardSize.classList.toggle('drag-outside',!!drag&&step==='arrange'&&(point.x<0||point.x>WIDTH||point.y<0||point.y>HEIGHT));}
function coordinates(e){const r=board.getBoundingClientRect();return {x:(e.clientX-r.left)/boardScale,y:(e.clientY-r.top)/boardScale};}
for(const targetBoard of [$('#board'),$('#back-board')]){
targetBoard.addEventListener('pointerdown',e=>{
 if(step!=='arrange'||e.button!==0)return;const point=coordinates(e),handle=e.target.closest('[data-handle]')?.dataset.handle;
 const hitId=scene?.pick(point.x,point.y);const p=handle?chosen():plants().find(p=>p.id===hitId)||[...plants()].reverse().find(p=>!scene?.loaded(p.id)&&hitPlant(p,point.x,point.y,alphaMaps.get(p.source)));
 select(p?.id||null);if(!p)return;scene?.disturb(p.id);e.preventDefault();board.focus({preventScroll:true});board.setPointerCapture(e.pointerId);drag={kind:handle||(dragMode==='orbit'&&scene?.loaded(p.id)?'orbit':'move'),pointerId:e.pointerId,start:point,plant:clone(p),before:clone(state),changed:false};updateCardBoundary(point);
});
targetBoard.addEventListener('pointermove',e=>{
 if(!drag||drag.pointerId!==e.pointerId)return;const point=coordinates(e),p=chosen(),initial=drag.plant;updateCardBoundary(point);if(!p)return;
 if(drag.kind==='move'){p.x=clamp(initial.x+point.x-drag.start.x,-40,1240);p.y=clamp(initial.y+point.y-drag.start.y,-100,1050);}
 else if(drag.kind==='orbit'){p.yaw=clamp((initial.yaw||0)+(point.x-drag.start.x)*.5,-180,180);p.pitch=clamp((initial.pitch||0)+(point.y-drag.start.y)*.5,-180,180);}
 else if(drag.kind==='scale'){const startDistance=Math.hypot(drag.start.x-initial.x,drag.start.y-initial.y);p.scale=clamp(initial.scale*Math.hypot(point.x-initial.x,point.y-initial.y)/Math.max(startDistance,1),.2,1.8);}
 else{const delta=Math.atan2(point.y-initial.y,point.x-initial.x)-Math.atan2(drag.start.y-initial.y,drag.start.x-initial.x);p.rotation=clamp(initial.rotation+delta*180/Math.PI,-180,180);}
 drag.changed=true;renderPlants();
});
targetBoard.addEventListener('pointerup',finishDrag);targetBoard.addEventListener('pointercancel',finishDrag);targetBoard.addEventListener('lostpointercapture',finishDrag);
}
function finishDrag(e){if(!drag||drag.pointerId!==e.pointerId)return;cardSize.classList.remove('drag-outside');if(drag.changed){history.push(drag.before);save();}drag=null;scene?.disturb(null);render();}
window.addEventListener('blur',()=>{if(drag)finishDrag({pointerId:drag.pointerId});});
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea')||$('#export-dialog').open)return;
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
 if(step!=='arrange')return;if(e.key==='Escape'){select(null);setLibrary(false);return;}const p=chosen();if(!p)return;
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('#delete-plant').click();}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const d=e.shiftKey?20:5;change(()=>{if(e.key==='ArrowLeft')p.x=clamp(p.x-d,-40,1240);if(e.key==='ArrowRight')p.x=clamp(p.x+d,-40,1240);if(e.key==='ArrowUp')p.y=clamp(p.y-d,-100,1050);if(e.key==='ArrowDown')p.y=clamp(p.y+d,-100,1050);});}
});
const cardRotation=attachCardRotation(cardSize,$('#flipper'),{enabled:()=>step==='preview',onInteraction:()=>{$('#tilt-shell').style.transform='none';},onFacingChange:back=>{flipped=back;activateScenes();$('#flipper').classList.toggle('flipped',back);$('#flip-card').textContent=back?'翻回花园 ↻':'翻到背面 ↻';$('#flip-card').setAttribute('aria-pressed',String(back));}});
const cleanupGardenMotion=attachCardMotion(document.documentElement,s=>{if(step!=='arrange'||drag||selected)return;const tilt={x:s.x*2.4,y:s.y*2.4};scenes.front?.draw(tilt);scenes.back?.draw({x:-tilt.x,y:tilt.y});$('#card-title').style.translate=`${s.x*16}px ${s.y*10}px`;},{response:10});
const cleanupMotion=attachCardMotion(cardSize,s=>{if(step!=='preview'||cardRotation.busy)return;$('#tilt-shell').style.transform=`rotateX(${s.rotateX}deg) rotateY(${s.rotateY}deg)`;scenes.front?.draw({x:s.x*1.6,y:s.y*1.6});scenes.back?.draw({x:(flipped?-s.x:s.x)*1.6,y:s.y*1.6});},{maxTilt:18,response:10});
function fallbackCanvas(list,onlyId=null){const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');for(const p of list){if(onlyId&&p.id!==onlyId)continue;const img=sourceImages.get(p.source);if(!img)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation*Math.PI/180);ctx.scale(p.scale*(p.mirror?-1:1),p.scale);ctx.drawImage(img,-270,-360,540,720);ctx.restore();}return canvas;}
async function createCardFile(kind,card=clone(state)){
 await imageReady;const canvases={},layers={};
 for(const side of ['front','back']){
  const list=side==='front'?card.plants:card.backPlants,view=scenes[side],complete=view?await view.ready():false;
  if(!complete&&list.some(p=>p.pitch||p.yaw))throw Error('3D 模型尚未就绪，请等待模型加载后重试，以保留立体角度。');
  const source=complete?view.snapshot():fallbackCanvas(list),copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;copy.getContext('2d').drawImage(source,0,0);canvases[side]=copy;
  if(kind==='html')layers[side]=complete?view.layers():list.map(p=>({id:p.id,depth:p.depth,url:fallbackCanvas(list,p.id).toDataURL('image/png')}));
 }
 const blob=kind==='png'?await exportPNG(card,canvases.front,canvases.back,false):await exportInteractive(card,canvases.front,layers.front,canvases.back,layers.back,false);
 const recipient=(card.to||'你').replace(/[\\/:*?"<>|\r\n]/g,'_');return new File([blob],`给${recipient}的${kind==='png'?'花朵卡片.png':'一束花.html'}`,{type:blob.type});
}
const cardSharing=setupCardSharing({createFile:createCardFile});
async function exportCard(kind){
 const status=$('#export-status');$$('.export-choice').forEach(b=>b.disabled=true);status.textContent='正在把花朵和祝福装进卡片…';
 try{const file=await createCardFile(kind);downloadBlob(file,file.name);status.textContent=kind==='png'?'正反面图片已保存，可以直接发送给朋友。':`互动卡片已保存（${(file.size/1024/1024).toFixed(1)} MB）。下载后用浏览器打开即可。`;}
 catch(error){console.error(error);status.textContent=error.message||'导出没有成功，请再试一次。';}
 finally{$$('.export-choice').forEach(b=>b.disabled=false);}
}
$('#export-html').onclick=()=>exportCard('html');$('#export-png').onclick=()=>exportCard('png');
render();resize();window.addEventListener('resize',resize,{passive:true});new ResizeObserver(resize).observe($('.canvas-area'));
const imageReady=Promise.all(PLANTS.map(([source])=>new Promise(resolve=>{const img=new Image();img.onload=()=>{sourceImages.set(source,img);const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);alphaMaps.set(source,ctx.getImageData(0,0,canvas.width,canvas.height));resolve();};img.onerror=()=>resolve();img.src=`./assets/flowers/${source}.png`;})));
try{
 const {createFlowerScene}=await import('./lib/flowers-3d.js?v=stem-projection-1');
 for(const side of ['front','back']){
  try{scenes[side]=createFlowerScene($(side==='front'?'#model-layer':'#back-model-layer'),manifest,{active:side==='front',onReady:id=>{const img=photoMaps[side].get(id);if(img)img.style.visibility='hidden';if(side===editSide&&id===selected)updateSelection();},onError:id=>{if(!id){scenes[side]?.dispose();scenes[side]=null;if(editSide===side)scene=null;for(const img of photoMaps[side].values())img.style.visibility='visible';}$('#save-state').textContent='原图预览 · 编辑已保存';}});scenes[side].setPlants(side==='front'?state.plants:state.backPlants);}catch(error){console.warn('使用原图交互预览：',error.message);}
 }
 scene=scenes[editSide];activateScenes();
}catch(error){console.warn('使用原图交互预览：',error.message);}
window.addEventListener('pagehide',()=>{cleanupGardenMotion();cleanupMotion();cardRotation.dispose();Object.values(scenes).forEach(s=>s?.dispose());},{once:true});
