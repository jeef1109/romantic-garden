import LZString from '../vendor/lz-string/lz-string.js';
import {validCard,PLANTS} from './card-state.js';
export const VIEWER_ORIGIN='https://budarina-card-viewer-nov03.wiliamking44.chatgpt.site';
const numeric=['x','y','scale','rotation','pitch','yaw','depth'];
function packPlant(p){return [PLANTS.findIndex(([s])=>s===p.source),...numeric.map(k=>Math.round((p[k]||0)*10000)/10000),p.mirror?1:0];}
export function encodeCardLink(card,base=VIEWER_ORIGIN){
 const valid=validCard(card);if(!valid)throw Error('卡片内容不完整，请返回编辑后重试。');
 const payload=[1,crypto.randomUUID(),valid.theme==='dark'?1:0,valid.title,valid.to,valid.from,valid.message,valid.plants.map(packPlant),valid.backPlants.map(packPlant)];
 const token=LZString.compressToEncodedURIComponent(JSON.stringify(payload));if(token.length>12000)throw Error('卡片内容太多，请改用卡片文件分享。');
 return new URL('/#card='+encodeURIComponent(token),base).href;
}
export function decodeCardLink(hash){
 if(typeof hash!=='string'||!hash.startsWith('#card=')||hash.length>36006)throw Error('请使用朋友发来的完整卡片链接。');
 const token=decodeURIComponent(hash.slice(6));if(!token||token.length>12000||!/^[A-Za-z0-9+$-]+$/.test(token))throw Error('卡片链接不完整，请重新复制。');
 const raw=LZString.decompressFromEncodedURIComponent(token);if(!raw||raw.length>65536)throw Error('卡片链接无法读取，请重新复制。');
 const a=JSON.parse(raw);if(!Array.isArray(a)||a.length!==9||a[0]!==1||typeof a[1]!=='string'||!/^[a-f0-9-]{36}$/.test(a[1])||![0,1].includes(a[2]))throw Error('卡片版本无法识别。');
 const unpack=(list,side)=>{if(!Array.isArray(list)||list.length>30)throw Error('卡片植物数量不正确。');return list.map((v,i)=>{if(!Array.isArray(v)||v.length!==9||!Number.isInteger(v[0])||!PLANTS[v[0]]||![0,1].includes(v[8])||!v.slice(1,8).every(Number.isFinite))throw Error('卡片植物数据不完整。');return {id:side+'-'+i,source:PLANTS[v[0]][0],...Object.fromEntries(numeric.map((k,j)=>[k,v[j+1]])),mirror:!!v[8]};});};
 const card=validCard({version:2,theme:a[2]?'dark':'light',title:a[3],to:a[4],from:a[5],message:a[6],plants:unpack(a[7],'front'),backPlants:unpack(a[8],'back')});if(!card)throw Error('卡片内容无法读取。');return card;
}
