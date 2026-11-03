import json,struct,math,numpy as np
from pathlib import Path
root=Path('dist/assets/models');b=(root/'flower-01.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=bytearray(b[28+n:]);node=np.array(j['nodes'][0]['matrix']).reshape(4,4).T;y=-1.3808251600396144;r=np.array([[math.cos(y),0,math.sin(y),0],[0,1,0,0],[-math.sin(y),0,math.cos(y),0],[0,0,0,1]]);inverse=np.linalg.inv(r@node)
# Reconstruct a thin curved petal over the malformed lower rim. Both faces and
# the shared rim are geometric, so the repair remains volumetric when rotated.
from PIL import Image
N=36;verts=[];faces=[];a=np.array([.0240,.2490,.1390]);bb=np.array([.0290,.1590,.1930]);c=np.array([.0910,.2080,.1880]);grid={}
photo=np.array(Image.open('dist/assets/flowers/flower-01.png').convert('RGBA'))
def petal(point):
 qx=(point[0]+.16754616)/(.21716658+.16754616);qy=(point[1]+.49902299)/.99804598
 u=.2716390423572744+qx*(.7191528545119705-.2716390423572744);v=.9848066298342542-qy*(.9848066298342542-.026243093922651933)
 ix=int(u*photo.shape[1]);iy=int(v*photo.shape[0]);red,green,blue,alpha=photo[iy,ix].astype(float)
 return alpha>200 and not (green>red*1.12 and green>blue*1.5)
for i in range(N+1):
 for k in range(N+1-i):
  u=i/N;vv=k/N;w=1-u-vv;point=a*w+bb*u+c*vv;point[2]+=.0027+.007*27*u*vv*w;grid[i,k]=len(verts);verts.append(point.tolist())
for i in range(N):
 for k in range(N-i):
  tris=[[grid[i,k],grid[i+1,k],grid[i,k+1]]]
  if i+k<N-1:tris.append([grid[i+1,k],grid[i+1,k+1],grid[i,k+1]])
  for tri in tris:
   if all(petal(verts[j]) for j in tri):faces.append(tri)
used=sorted(set(j for tri in faces for j in tri));remap={old:new for new,old in enumerate(used)};verts=[verts[j] for j in used];faces=[[remap[j] for j in tri] for tri in faces];frontCount=len(verts);frontFaces=list(faces);edges={}
for tri in frontFaces:
 for aa,ab in zip(tri,tri[1:]+tri[:1]):
  key=tuple(sorted([aa,ab]));edges.setdefault(key,[]).append((aa,ab))
verts += [[x,y,z-.0024] for x,y,z in verts];faces += [[j+frontCount for j in tri[::-1]] for tri in frontFaces]
for directions in edges.values():
 if len(directions)==1:
  aa,ab=directions[0];ba,bc=aa+frontCount,ab+frontCount;faces.extend([[aa,ba,bc],[aa,bc,ab]])
v=np.array(verts);f=np.array(faces,dtype='<u2');local=(np.c_[v,np.ones(len(v))]@inverse.T)[:,:3];norm=np.zeros_like(local);cross=np.cross(local[f[:,1]]-local[f[:,0]],local[f[:,2]]-local[f[:,0]]);
for i in range(3):np.add.at(norm,f[:,i],cross)
norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-12)
lo=np.array([-.16754616,-.49902299,-.22587522]);hi=np.array([.21716658,.49902299,.1955592]);q=(v-lo)/(hi-lo);a=[.2716390423572744,.026243093922651933,.7191528545119705,.9848066298342542];uv=np.c_[a[0]+q[:,0]*(a[2]-a[0]),a[3]-q[:,1]*(a[3]-a[1])]
def view(raw):
 while len(data)%4:data.append(0)
 idx=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':len(raw)});data.extend(raw);return idx
def accessor(array,kind,typ):
 idx=len(j['accessors']);entry={'bufferView':view(array.tobytes()),'componentType':typ,'count':len(array),'type':kind}
 if kind=='VEC3':entry.update(min=array.min(0).tolist(),max=array.max(0).tolist())
 j['accessors'].append(entry);return idx
pos=accessor(local.astype('<f4'),'VEC3',5126);normal=accessor(norm.astype('<f4'),'VEC3',5126);tex=accessor(uv.astype('<f4'),'VEC2',5126);indices=accessor(f.reshape(-1,1),'SCALAR',5123)
material=len(j['materials']);j['materials'].append({'name':'Repaired lower petal','pbrMetallicRoughness':{'baseColorFactor':[1,.93,.72,1],'metallicFactor':0,'roughnessFactor':.9},'doubleSided':True})
j['meshes'][0]['primitives'].append({'attributes':{'POSITION':pos,'NORMAL':normal,'TEXCOORD_0':tex},'indices':indices,'material':material});j['buffers'][0]['byteLength']=len(data)
j['asset']['extras']={'repair':'Curved closed lower-petal patch at the source mesh reconstruction notch; original model preserved.'}
while len(data)%4:data.append(0)
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4);out=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data;(root/'flower-01-repaired.glb').write_bytes(out)
edges=np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1);_,count=np.unique(edges,axis=0,return_counts=True);assert (count==2).all();assert np.isfinite(local).all();print('Patch:',len(local),'vertices',len(f),'triangles; closed manifold shell; GLB bytes',len(out))
