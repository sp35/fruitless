import fs from 'node:fs';import zlib from 'node:zlib';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createSimulation,readout,PARAMS}from '../dist/model.js';
const m=JSON.parse(fs.readFileSync('dist/data/manifest.json'));const g={n:m.neurons,targets:new Uint32Array(m.connections),counts:new Uint32Array(m.connections),groups:m.groups};
for(const f of m.files){const b=zlib.gunzipSync(fs.readFileSync('dist/'+f.url));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);const a=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);if(f.name==='signs')g.signs=new Int8Array(a);else if(f.name==='offsets')g.offsets=new Uint32Array(a);else g[f.name.startsWith('targets')?'targets':'counts'].set(new Uint32Array(a),Number(f.name.split('-')[1])*2000000)}
assert.equal(g.offsets.length,166701);assert.equal(g.offsets.at(-1),25582938);let sum=0;for(let i=0;i<g.counts.length;i++){assert.ok(g.targets[i]<g.n);assert.ok(g.counts[i]>0);sum+=g.counts[i]}assert.equal(sum,m.synapses);
const reports=[];for(const [name,p,options]of [
 ['silent',{visualHz:0,chemicalHz:0,inhibitoryHz:0},{}],
 ['candidate-A',{visualHz:60,chemicalHz:100,inhibitoryHz:0},{}],
 ['candidate-B',{visualHz:15,chemicalHz:30,inhibitoryHz:30},{}],
 ['disconnected',{visualHz:60,chemicalHz:100,inhibitoryHz:0},{disconnect:true}],
 ['output-silenced',{visualHz:60,chemicalHz:100,inhibitoryHz:0},{silence:m.groups.output}],
]){let s;const start=performance.now(),sim=createSimulation(g,p,options);do{s=sim.tick()}while(!s.done);if(name==='silent')assert.equal(s.total,0);if(name==='disconnected'||name==='output-silenced')assert.equal(s.outputHz,0);const r={name,seconds:(performance.now()-start)/1000,outputHz:s.outputHz,groupHz:s.groupHz,spikes:s.total,outcome:readout(s.outputHz)};reports.push(r);console.log(JSON.stringify(r))}
fs.writeFileSync('work/connectome-validation.json',JSON.stringify({dataset:m.dataset,neurons:g.n,connections:g.targets.length,parameters:PARAMS,reports},null,2));
