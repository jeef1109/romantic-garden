import {decodeCardLink} from './lib/card-link.js';
import {renderCard} from './lib/card-export.js?v=romantic-garden-1';
import {attachCardRotation} from './lib/card-rotation.js?v=drag-flip-1';
import {attachCardMotion} from './lib/card-motion.js';
const $=id=>document.getElementById(id),scenes={front:null,back:null};let cleanup=()=>{},rotation=null,flipped=false;
async function showCard(){
 let card;try{card=decodeCardLink(location.hash);}catch(error){$('empty-note').textContent=location.hash?'链接不完整或无法读取，请让朋友重新复制完整链接。':'请从朋友发来的完整卡片链接进入。';return;}
 document.body.classList.toggle('dark',card.theme==='dark');$('empty').hidden=true;$('gift').hidden=false;document.title='送给'+(card.to||'你')+'的一束花';$('recipient').textContent='For '+(card.to||'you')+'.';$('signature').textContent='With love, '+(card.from||'我');$('message').textContent=card.message;$('load-status').textContent='花朵正在舒展…';
 const blank=document.createElement('canvas');blank.width=1200;blank.height=760;
 const backgrounds=await Promise.all([renderCard(card,blank,'front'),renderCard(card,null,'back')]);['front','back'].forEach((side,i)=>{$(side+'-background').src=backgrounds[i].toDataURL();});
 const resize=()=>{const scale=$('card-size').clientWidth/1200;document.querySelectorAll('.board').forEach(el=>el.style.transform=`scale(${scale})`);};new ResizeObserver(resize).observe($('card-size'));resize();
 const photoMaps={front:new Map(),back:new Map()},lists={front:card.plants,back:card.backPlants};
 for(const side of ['front','back'])for(const p of lists[side]){const img=new Image();img.src='./assets/flowers/'+p.source+'.png';img.alt='';img.className='plant-photo';img.style.transform=`translate(${p.x-270}px,${p.y-360}px) rotate(${p.rotation}deg) scale(${p.scale*(p.mirror?-1:1)},${p.scale})`;$(side+'-photos').append(img);photoMaps[side].set(p.id,img);}
 let failed=false;const status=()=>{$('load-status').textContent=failed?'当前为原图预览，部分立体角度暂未显示。':Object.values(lists).every((list,i)=>list.every(p=>scenes[['front','back'][i]]?.loaded(p.id)))?'':'花朵正在舒展…';};
 try{const [manifest,{createFlowerScene}]=await Promise.all([fetch('./assets/models/manifest.json').then(r=>{if(!r.ok)throw Error('assets');return r.json();}),import('./lib/flowers-3d.js?v=stem-projection-1')]);
  for(const side of ['front','back']){scenes[side]=createFlowerScene($(side+'-models'),manifest,{active:side==='front',onReady:id=>{photoMaps[side].get(id).hidden=true;status();},onError:id=>{failed=true;if(!id){scenes[side]?.dispose();scenes[side]=null;for(const img of photoMaps[side].values())img.hidden=false;}status();}});scenes[side].setPlants(lists[side]);}status();
 }catch{failed=true;status();}
 rotation=attachCardRotation($('card-size'),$('flipper'),{onInteraction:()=>{$('tilt').style.transform='none';},onFacingChange:setFacing});
 cleanup=attachCardMotion($('card-size'),s=>{if(rotation?.busy)return;$('tilt').style.transform=`rotateX(${s.rotateX}deg) rotateY(${s.rotateY}deg)`;scenes.front?.draw({x:s.x*1.6,y:s.y*1.6});scenes.back?.draw({x:-s.x*1.6,y:s.y*1.6});for(const side of ['front','back'])for(const p of lists[side]){const img=photoMaps[side].get(p.id);img.style.translate=`${(side==='front'?s.x:-s.x)*p.depth*.288}px ${s.y*p.depth*.288}px`; }},{maxTilt:18,response:10});
}
function setFacing(back){flipped=back;scenes.front?.setActive(!flipped);scenes.back?.setActive(flipped);$('flipper').classList.toggle('flipped',flipped);$('flip').textContent=flipped?'再看看花园 ↻':'读一读祝福 ↻';$('flip').setAttribute('aria-pressed',String(flipped));$('front-face').setAttribute('aria-hidden',String(flipped));$('back-face').setAttribute('aria-hidden',String(!flipped));}
$('flip').onclick=()=>rotation?.flip();
showCard().catch(()=>{$('gift').hidden=true;$('empty').hidden=false;$('empty-note').textContent='卡片暂时无法打开，请检查网络后刷新。';});
window.addEventListener('pagehide',()=>{cleanup();rotation?.dispose();Object.values(scenes).forEach(s=>s?.dispose());},{once:true});
window.addEventListener('hashchange',()=>location.reload());
