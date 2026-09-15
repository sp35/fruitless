// Audit instrumentation: adds stimulus offset; dynamics unchanged.
// MaleCNS dynamics adapted from Shiu et al. 2024; not a validated courtship emulator.
export const PARAMS={dtMs:.2,durationMs:1000,restMv:-52,thresholdMv:-45,resetMv:-52,membraneMs:20,synapseMs:5,refractoryMs:2.2,delayMs:1.8,synapseMv:.275};
export function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
export function createSimulation(graph,profile,{seed=703,scale=1,silence=[],disconnect=false,durationMs=1000,stimulusMs=1000}={}){
 const {n,offsets,targets,counts,signs,groups}=graph,p=PARAMS,steps=Math.round(durationMs/p.dtMs),random=rng(seed);
 const v=new Float64Array(n),g=new Float64Array(n),until=new Int32Array(n),spikeCounts=new Uint32Array(n),blocked=new Uint8Array(n),activeMark=new Uint8Array(n),active=[];
 for(const i of silence)blocked[i]=1;
 const delay=Math.round(p.delayMs/p.dtMs),queue=Array.from({length:delay+1},()=>[]),eM=Math.exp(-p.dtMs/p.membraneMs),eS=Math.exp(-p.dtMs/p.synapseMs),coupling=(eS-eM)/(1-p.membraneMs/p.synapseMs),refractory=Math.round(p.refractoryMs/p.dtMs);
 // Voltage is represented relative to resting potential. Analytic subthreshold update.
 const inputs=[];for(const [name,rate] of [['visual',profile.visualHz],['chemical',profile.chemicalHz],['inhibitory',profile.inhibitoryHz]])for(const i of groups[name])inputs.push([i,rate]);
 function activate(i){if(!activeMark[i]){activeMark[i]=1;active.push(i)}}
 let step=0,total=0;const output=groups.output;const groupCounts=Object.fromEntries(Object.keys(groups).map(k=>[k,0]));
 const membership=Array.from({length:n},()=>null);for(const [k,list]of Object.entries(groups))for(const i of list)(membership[i]??=[]).push(k);
 return {spikeCounts,steps,get step(){return step},tick(){const fired=[],q=queue[step%queue.length];
  if(!disconnect)for(const pre of q){const signed=signs[pre]*p.synapseMv*scale;if(!signed)continue;for(let e=offsets[pre];e<offsets[pre+1];e++){const post=targets[e];if(blocked[post])continue;g[post]+=counts[e]*signed;activate(post)}}q.length=0;
  for(let a=0;a<active.length;a++){const i=active[a];if(blocked[i])continue;if(step>=until[i])v[i]=v[i]*eM+g[i]*coupling;g[i]*=eS;if(step>=until[i]&&v[i]>=p.thresholdMv-p.restMv){v[i]=0;until[i]=step+refractory;fired.push(i)}}
  // Explicit optogenetic-like relay stimulation: cue->rate mapping is assumed, not measured.
  for(const [i,rate]of inputs){if(blocked[i]||step<until[i])continue;if(random()<(step*p.dtMs<stimulusMs?rate:0)*p.dtMs/1000){activate(i);v[i]=0;until[i]=step+refractory;fired.push(i)}}
  for(const i of fired){spikeCounts[i]++;total++;for(const k of membership[i]||[])groupCounts[k]++;queue[(step+delay)%queue.length].push(i)}step++;
  return {step,fired,total,active:active.length,ms:step*p.dtMs,done:step>=steps,outputHz:output.reduce((s,i)=>s+spikeCounts[i],0)/(output.length*step*p.dtMs/1000),groupHz:Object.fromEntries(Object.entries(groups).map(([k,list])=>[k,list.length?groupCounts[k]/(list.length*step*p.dtMs/1000):0]))}
 }}}
export function readout(outputHz){return outputHz>=5?'right':outputHz===0?'left':'unclear'}
