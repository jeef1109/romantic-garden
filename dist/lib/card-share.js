import {encodeCardLink} from './card-link.js?v=github-pages-1';
import {downloadBlob} from './card-export.js?v=share-files-1';
export function shareMessage(card){return `送给${card.to||'你'}的一束花\n\n${card.message}\n\n${card.from?'来自 '+card.from:'送你一点花开的心意'}`;}
export function mailDraft(card,kind,url=null){
 const subject=`送给${card.to||'你'}的花朵卡片`.replace(/[\r\n]/g,' ');
 const instructions=kind==='link'?'我做了一张花朵卡片，点击下面的完整链接即可查看：\n'+url:kind==='html'?'我做了一张可以翻面的花朵卡片。请下载附件，再用浏览器打开。':'我做了一张花朵卡片，正反面都在附件图片里。';
 return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMessage(card)+'\n\n'+instructions)}`;
}
export function canShareFile(nav,file){try{return !!file&&typeof nav.share==='function'&&typeof nav.canShare==='function'&&nav.canShare({files:[file]});}catch{return false;}}
export function setupCardSharing({createFile}){
 const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('[data-share-channel]')];
 let card=null,file=null,link=null,channel='wechat',generation=0,sharing=false;const cache=new Map();
 const names={wechat:'微信',qq:'QQ',email:'邮件',other:'其他应用'};
 function update(){
  const kind=$('share-format').value,isLink=kind==='link',ready=isLink?!!link:!!file,supported=isLink?!!link&&typeof navigator.share==='function':canShareFile(navigator,file),name=names[channel];
  $('share-link-panel').hidden=!isLink;$('share-save').hidden=isLink;if(link){$('share-link-value').value=link;$('share-link-open').href=link;}
  $('share-link-copy').disabled=!link;
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shareChannel===channel)));
  $('share-email').hidden=channel!=='email';if(card)$('share-email').href=mailDraft(card,kind,link);
  $('share-system').disabled=!supported||sharing;$('share-save').disabled=!file||sharing;
  $('share-system').textContent=!ready?'正在准备卡片…':supported?'打开系统分享，选择'+name:(isLink?'请复制链接后发送':'此浏览器暂不支持分享此类文件');
  $('share-save').textContent=channel==='email'?'保存卡片，稍后添加为邮件附件':'保存卡片，再通过'+name+'发送';
  $('share-guide').textContent=channel==='email'?'可以在系统分享中选择邮件应用；也可先保存卡片，再打开邮件草稿，手动添加刚保存的附件。打开草稿不会自动发送。':`支持的设备可在系统分享中选择${name}。如果列表里没有该应用，请先保存卡片，再到聊天中发送${kind==='png'?'图片':'文件'}。`;
  if(isLink)$('share-guide').textContent=channel==='email'?'打开邮件草稿，即可带上卡片链接和祝福文案；选择收件人后由你确认发送。':`复制卡片链接，粘贴到${name==='其他应用'?'聊天或其他应用':name+'聊天'}中发送。支持的设备也可以使用系统分享。朋友点开完整链接即可看卡片。`;
  if(kind==='html')$('share-guide').textContent+=' 互动文件需下载后用浏览器打开；想让朋友直接在聊天中看，建议选卡片图片。';
 }
 async function prepare(){
  const token=++generation,kind=$('share-format').value;file=null;update();$('share-file-info').textContent='正在准备正反面卡片…';$('share-status').textContent='';$('share-retry').hidden=true;
  try{if(kind==='link'){link??=encodeCardLink(card);$('share-file-info').textContent='卡片链接已准备好 · 正反面布局已保存';update();return;}if(!cache.has(kind))cache.set(kind,createFile(kind,card));const result=await cache.get(kind);if(token!==generation)return;file=result;$('share-file-info').textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`;update();}
  catch(error){if(token!==generation)return;cache.delete(kind);$('share-file-info').textContent=error.message||'卡片准备失败，请重试。';$('share-retry').hidden=false;}
 }
 buttons.forEach(b=>b.onclick=()=>{channel=b.dataset.shareChannel;$('share-status').textContent='';update();});
 $('share-format').onchange=prepare;$('share-retry').onclick=prepare;
 // File preparation happens before this click, preserving browser user activation.
 $('share-system').onclick=async()=>{
  const isLink=$('share-format').value==='link';if(sharing||(isLink?!link:!file))return;if(isLink?typeof navigator.share!=='function':!canShareFile(navigator,file)){update();return;}
  sharing=true;update();
  try{await navigator.share(isLink?{url:link,title:`送给${card.to||'你'}的花朵卡片`}:{files:[file],title:`送给${card.to||'你'}的花朵卡片`});$('share-status').textContent='已交给所选应用，请在应用中确认发送。';}
  catch(error){$('share-status').textContent=error.name==='AbortError'?'已关闭分享，你可以重新选择。':(isLink?'未能打开系统分享。请复制卡片链接后发送。':'未能打开系统分享。请保存卡片后，在微信、QQ 或邮件中发送。');}
  finally{sharing=false;update();}
 };
 $('share-save').onclick=()=>{if(file){downloadBlob(file,file.name);$('share-status').textContent=channel==='email'?'已开始下载。打开邮件草稿后，请手动添加这份附件。':'已开始下载。请到'+names[channel]+'中选择刚保存的'+($('share-format').value==='png'?'图片':'文件')+'发送。';}};
 $('share-email').onclick=()=>{$('share-status').textContent=$('share-format').value==='link'?'将尝试打开默认邮件应用，链接已放入草稿。请选择收件人后确认发送；若未打开，可复制链接到邮箱。':'将尝试打开默认邮件应用；请添加卡片附件、选择收件人，再确认发送。若没有打开，可复制祝福文案到邮箱。';};
 $('share-copy').onclick=async()=>{const text=shareMessage(card)+($('share-format').value==='link'?'\n\n'+link:'');try{await navigator.clipboard.writeText(text);$('share-status').textContent='祝福文案已复制，可粘贴到聊天或邮件。';$('share-copy-fallback').hidden=true;}catch{$('share-copy-fallback').hidden=false;$('share-copy-fallback').value=text;$('share-copy-fallback').focus();$('share-copy-fallback').select();$('share-status').textContent='请手动复制下方祝福文案。';}};
 $('share-link-copy').onclick=async()=>{if(!link)return;try{await navigator.clipboard.writeText(link);$('share-status').textContent='卡片链接已复制，可粘贴到微信、QQ 或邮件。';}catch{$('share-link-value').focus();$('share-link-value').select();$('share-status').textContent='请手动复制上方完整卡片链接。';}};
 $('export-dialog').addEventListener('close',()=>{generation++;file=null;link=null;cache.clear();});
 return {open(value){card=value;link=null;cache.clear();$('share-copy-fallback').hidden=true;prepare();}};
}
