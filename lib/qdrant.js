const base=process.env.QDRANT_URL||'http://localhost:6333'; const collection=process.env.QDRANT_COLLECTION||'researchlens_chunks';
async function req(path,opts={}){const r=await fetch(base+path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})}}); if(!r.ok)throw new Error(`Qdrant ${r.status}: ${await r.text()}`); return r.json();}
export async function ensureCollection(dim){const r=await fetch(`${base}/collections/${collection}`); if(r.ok)return; await req(`/collections/${collection}`,{method:'PUT',body:JSON.stringify({vectors:{size:dim,distance:'Cosine'}})});}
export async function upsert(points){await req(`/collections/${collection}/points?wait=true`,{method:'PUT',body:JSON.stringify({points})});}
export async function search(vector,limit=5){const j=await req(`/collections/${collection}/points/search`,{method:'POST',body:JSON.stringify({vector,limit,with_payload:true})});return j.result||[];}
