"""Reproducible MaleCNS v1.0 export. No edges are invented or trained."""
from pathlib import Path
import hashlib,gzip,json,time
import numpy as np,pandas as pd,pyarrow.ipc as ipc,pyarrow.feather as feather
RAW=Path('work/malecns'); OUT=Path('dist/data');OUT.mkdir(parents=True,exist_ok=True)
a=feather.read_feather(RAW/'annotations.feather');a=a[a.superclass.notna()].sort_values('bodyId').reset_index(drop=True)
assert len(a)==166700
ids=pd.Index(a.bodyId); n=len(a)
nt=feather.read_feather(RAW/'neurotransmitters.feather').set_index('body').reindex(ids)
labels=nt.consensus_nt.fillna('unknown');sign=np.where(labels.isin(['gaba','glutamate','GABA','histamine']),-1,np.where(labels.isin(['unknown','unclear']),0,1)).astype('int8')
print('NT distribution',labels.value_counts().to_dict(),flush=True)
pre=[];post=[];weights=[]
with ipc.open_file(RAW/'weights.feather') as r:
 for k in range(r.num_record_batches):
  b=r.get_batch(k);src=ids.get_indexer(b.column('body_pre').to_numpy());dst=ids.get_indexer(b.column('body_post').to_numpy());w=b.column('weight').to_numpy();keep=(src>=0)&(dst>=0)
  pre.append(src[keep].astype('<u4'));post.append(dst[keep].astype('<u4'));weights.append(w[keep].astype('<u4'))
src=np.concatenate(pre);dst=np.concatenate(post);w=np.concatenate(weights);del pre,post,weights
order=np.argsort(src,kind='stable');src=src[order];dst=dst[order];w=w[order];del order
assert len(src)==25582938
assert np.all(w>0)
offsets=np.zeros(n+1,dtype='<u4');offsets[1:]=np.cumsum(np.bincount(src,minlength=n),dtype=np.uint32)
files=[]
def save(name,arr):
 raw=arr.tobytes();p=OUT/(name+'.bin.gz');p.write_bytes(gzip.compress(raw,compresslevel=6,mtime=0));files.append(dict(name=name,url='data/'+p.name,bytes=p.stat().st_size,rawBytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),dtype=str(arr.dtype),length=len(arr)))
save('offsets',offsets);save('signs',sign)
# Each object stays below common static-host size limits.
for start in range(0,len(dst),2000000):
 j=start//2000000;save('targets-'+str(j),dst[start:start+2000000]);save('counts-'+str(j),w[start:start+2000000])
types=a.type.fillna('untyped');groups={
 'visual':np.flatnonzero(types.eq('LC10a')).tolist(),
 'chemical':np.flatnonzero(a.synonyms.fillna('').str.contains('vAB3')).tolist(),
 'inhibitory':np.flatnonzero(types.str.match('^mAL_m')).tolist(),
 'courtship':np.flatnonzero(types.str.match('^pC1_')).tolist(),
 'output':np.flatnonzero(types.eq('pIP10')).tolist(),
 'pulseSong':np.flatnonzero(types.eq('pMP2')).tolist(),
 'persistence':np.flatnonzero(types.eq('DNpe034')).tolist()}
# Real soma coordinates, no invented brain anatomy. Null soma is omitted from projection.
loc=np.array([v if isinstance(v,np.ndarray) and len(v)==3 else [np.nan]*3 for v in a.somaLocation],dtype=float)
important=sorted(set(sum(groups.values(),[])));valid=np.flatnonzero(np.isfinite(loc).all(axis=1));sample=sorted(set(valid[::35].tolist()+[i for i in important if np.isfinite(loc[i]).all()]))
# Use x/z coronal projection in original 8-nm voxel coordinates, including VNC.
view=[dict(i=i,id=int(a.bodyId.iloc[i]),type=types.iloc[i],side=str(a.somaSide.iloc[i]) if pd.notna(a.somaSide.iloc[i]) else '',nt=labels.iloc[i],position=loc[i].astype(int).tolist()) for i in sample]
sample_set=set(sample);shown=np.array([i in sample_set for i in src])&np.array([i in sample_set for i in dst]);ix=np.flatnonzero(shown);ix=ix[np.argsort(w[ix])[-1800:]]
view_edges=[[int(src[i]),int(dst[i]),int(w[i])]for i in ix]
# Full identity table enables exact neuron lookup independently from render sampling.
ident=[dict(i=i,id=int(row.bodyId),type=types.iloc[i],superclass=row.superclass,nt=labels.iloc[i])for i,row in a.iterrows()]
identity=json.dumps(ident,separators=(',',':')).encode();(OUT/'neurons.json.gz').write_bytes(gzip.compress(identity,mtime=0))
source_names={'annotations':'body-annotations-male-cns-v1.0-minconf-0.5.feather','weights':'connectome-weights-male-cns-v1.0-minconf-0.5.feather','neurotransmitters':'body-neurotransmitters-male-cns-v1.0.feather'}
provenance=dict(dataset='MaleCNS v1.0',neurons=n,connections=len(src),synapses=int(w.sum()),files=files,downloadBytes=sum(f['bytes']for f in files),groups=groups,groupTypes={k:sorted(types.iloc[v].unique().tolist())for k,v in groups.items()},view=view,viewEdges=view_edges,unknownTransmitters=int((sign==0).sum()),source=[dict(url='https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/'+filename,sha256=hashlib.file_digest(open(RAW/(key+'.feather'),'rb'),'sha256').hexdigest())for key,filename in source_names.items()],license='CC-BY 4.0',filter='All 166700 annotation rows with a non-null superclass; every connection whose endpoints are in this set. No edge pruning, normalization, random wiring or learned weights.',neurotransmitters='consensus_nt: GABA, glutamate and histamine inhibitory; other known transmitters excitatory; unknown transmitters have zero outgoing effect. This is a model assumption, not a receptor-level measurement.')
(OUT/'manifest.json').write_text(json.dumps(provenance,separators=(',',':')))
print(json.dumps({k:provenance[k] for k in ['neurons','connections','synapses','downloadBytes','unknownTransmitters','groupTypes']}),flush=True)
print('groups', {k:len(v)for k,v in groups.items()},'render',len(view),flush=True)
