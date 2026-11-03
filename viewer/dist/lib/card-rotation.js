/** Direct manipulation of the whole preview card; plant editing stays separate. */
export function attachCardRotation(area, surface, {
  enabled=()=>true, onFacingChange=()=>{}, onInteraction=()=>{},
}={}) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let angle=0,pitch=0,target=0,back=false,gesture=null,raf=0,last=0,disposed=false;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const facing=()=>{
    const next=Math.cos(angle*Math.PI/180)<0;
    if(next!==back){back=next;onFacingChange(back);}
  };
  const paint=()=>{
    surface.style.transform=enabled()?`rotateX(${pitch}deg) rotateY(${angle}deg)`:'';
    surface.style.transition=enabled()?'none':'';
    facing();
  };
  const frame=time=>{
    raf=0;const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
    const alpha=1-Math.exp(-14*dt);angle+=(target-angle)*alpha;pitch*=1-alpha;
    if(Math.abs(target-angle)+Math.abs(pitch)<.03){angle=target;pitch=0;last=0;}
    else raf=requestAnimationFrame(frame);
    paint();
  };
  const settle=value=>{
    cancelAnimationFrame(raf);raf=0;last=0;target=value;
    if(reduced.matches){angle=target;pitch=0;paint();}else raf=requestAnimationFrame(frame);
  };
  const release=()=>{
    if(!gesture)return;const id=gesture.id;gesture=null;area.classList.remove('rotating');
    if(area.hasPointerCapture(id))area.releasePointerCapture(id);
  };
  const down=e=>{
    if(!enabled()||gesture||!e.isPrimary||e.button!==0||e.target.closest('button,a,input,textarea'))return;
    const bounds=area.getBoundingClientRect();if(!bounds.width)return;
    cancelAnimationFrame(raf);raf=0;last=0;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:angle,width:bounds.width,lastX:e.clientX,time:e.timeStamp,velocity:0,moved:false};
    area.setPointerCapture(e.pointerId);area.classList.add('rotating');onInteraction();e.preventDefault();
  };
  const move=e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(Math.hypot(dx,dy)<4&&!g.moved)return;g.moved=true;
    const dt=e.timeStamp-g.time;
    if(dt>0)g.velocity=(e.clientX-g.lastX)/dt*270/g.width;
    g.lastX=e.clientX;g.time=e.timeStamp;
    angle=g.start+dx/g.width*270;pitch=clamp(-dy/g.width*35,-16,16);paint();e.preventDefault();
  };
  const finish=e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const g=gesture,velocity=e.timeStamp-g.time<100?g.velocity:0;
    const projected=angle+(g.moved?clamp(velocity*110,-55,55):0);
    release();settle(Math.round(projected/180)*180);
  };
  const cancel=()=>{if(gesture){release();settle(Math.round(angle/180)*180);}};
  const flip=()=>{if(!enabled())return;release();onInteraction();settle(Math.round(angle/180)*180+180);};
  const key=e=>{if(enabled()&&e.target===area&&['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();flip();}};
  const reset=value=>{release();cancelAnimationFrame(raf);raf=0;last=0;pitch=0;angle=target=value?180:0;paint();};
  const preference=()=>{if(reduced.matches&&!gesture){cancelAnimationFrame(raf);raf=0;angle=target;pitch=0;paint();}};
  area.addEventListener('pointerdown',down);area.addEventListener('pointermove',move);
  area.addEventListener('pointerup',finish);area.addEventListener('pointercancel',cancel);area.addEventListener('lostpointercapture',cancel);
  area.addEventListener('keydown',key);window.addEventListener('blur',cancel);reduced.addEventListener('change',preference);
  return {flip,reset,get busy(){return !!gesture||!!raf;},dispose(){disposed=true;release();cancelAnimationFrame(raf);raf=0;
    area.removeEventListener('pointerdown',down);area.removeEventListener('pointermove',move);area.removeEventListener('pointerup',finish);
    area.removeEventListener('pointercancel',cancel);area.removeEventListener('lostpointercapture',cancel);area.removeEventListener('keydown',key);
    window.removeEventListener('blur',cancel);reduced.removeEventListener('change',preference);surface.style.transform='';surface.style.transition='';
  }};
}
