// Deliberately synthetic topology. No MaleCNS data or fitted biological parameters.
export const N=192, DT=.005, STEPS=1200;
export function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
export const groups=['Visual','Chemical','Integration','Courtship drive','Inhibition','Pursuit output'];
export const colors=['#77c8ff','#d4a1fa','#90b69a','#cefa69','#ff957e','#ecffc8'];
export const edges=[];const rand=rng(101);
for(let i=0;i<N;i++)for(let j=0;j<N;j++){const a=i>>5,b=j>>5;let w=0;if(a===0&&b===2)w=.1;if(a===1&&b===3)w=.12;if(a===2&&b===3)w=.1;if(a===3&&b===5)w=.18;if(a===4&&(b===3||b===5))w=-.18;if(a===b&&a===3)w=.03;if(w&&rand()<.19)edges.push({from:i,to:j,weight:w})}
export function createTrial({movement,chemical,contrast}){const random=rng(703);const voltage=new Float64Array(N),refractory=new Int16Array(N),previous=new Uint8Array(N);let step=0,out=0;const spikes=[];return {spikes, tick(){const input=new Float64Array(N);for(const e of edges)if(previous[e.from])input[e.to]+=e.weight;const fired=[];previous.fill(0);for(let i=0;i<N;i++){if(refractory[i]>0){refractory[i]--;continue}const group=i>>5;const motion=Math.exp(-Math.pow((movement-.45)/.4,2));let drive=.12;if(group===0)drive+=1.5*contrast*motion;if(group===1)drive+=1.6*chemical;if(group===4)drive+=1.7*(1-chemical);voltage[i]=voltage[i]*.82+drive*.18+input[i]+random()*.11;if(voltage[i]>=1){voltage[i]=0;refractory[i]=3;previous[i]=1;fired.push(i);spikes.push([step,i]);if(step>=600&&group===5)out++}}step++;return {step,fired,voltage:Array.from(voltage),outputHz:step>600?out/(32*(step-600)*DT):0,done:step>=STEPS}}}}
export function classify(hz){return hz>6?'pursue':hz<3?'pass':'unclear'}
