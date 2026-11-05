const assert=require('node:assert/strict');
const {createRoomReverb}=require('../src/reverb.ts');
const {DEFAULTS,reverbAmount,pool}=require('../src/music.ts');
const {SAMPLE_RATE,render}=require('../src/render.ts');
const {createSequenceRenderer}=require('../src/sequence.ts');

assert.equal(DEFAULTS.reverb,15);
for(const invalid of [undefined,null,NaN,Infinity,'50']){
  assert.equal(reverbAmount({...DEFAULTS,reverb:invalid}),15,'old or invalid saved settings use the default amount');
}
assert.equal(reverbAmount({...DEFAULTS,reverb:-1}),0);
assert.equal(reverbAmount({...DEFAULTS,reverb:150}),100);
assert.equal(reverbAmount({...DEFAULTS,reverb:15.6}),16);
assert.equal(reverbAmount({...DEFAULTS,reverb:0}),0,'zero remains a valid saved setting');

const impulse=new Float32Array(SAMPLE_RATE*3);impulse[0]=.5;
const dry=impulse.slice();createRoomReverb(0,SAMPLE_RATE)(dry);
assert.deepEqual(dry,impulse,'zero reverb is an exact bypass');
const room=impulse.slice();createRoomReverb(1,SAMPLE_RATE)(room);
assert.equal(room[0],impulse[0],'the dry attack remains intact');
assert.ok(room.subarray(1,Math.round(SAMPLE_RATE*.03)).every(value=>value===0),'the room has a short predelay before the reflections');
assert.ok(room.subarray(Math.round(SAMPLE_RATE*.04),Math.round(SAMPLE_RATE*.3)).some(value=>Math.abs(value)>.001),'the impulse produces a diffuse, audible tail');
assert.ok(room.every(Number.isFinite),'feedback stays finite');

const half=impulse.slice();createRoomReverb(.5,SAMPLE_RATE)(half);
for(let i=1;i<room.length;i++)assert.equal(half[i],room[i]*.5,'amount adjusts the return level without changing the decay');
let energy=0;
const remaining=new Float64Array(room.length);
for(let i=room.length-1;i>0;i--){energy+=room[i]*room[i];remaining[i]=energy;}
const crossing=db=>{
  const threshold=energy*10**(db/10);
  for(let i=1;i<remaining.length;i++)if(remaining[i]<=threshold)return i/SAMPLE_RATE;
  throw new Error('Room did not decay within the analysis window');
};
const decay=2*(crossing(-35)-crossing(-5));
assert.ok(decay>.7&&decay<1.3,`room decay stays close to one second, measured ${decay}`);

const input=new Float32Array(SAMPLE_RATE*3);
for(let i=0;i<SAMPLE_RATE;i++)input[i]=.1*Math.sin(2*Math.PI*220*i/SAMPLE_RATE)+.05*Math.sin(2*Math.PI*730*i/SAMPLE_RATE);
const continuous=input.slice();createRoomReverb(.65,SAMPLE_RATE)(continuous);
const streaming=createRoomReverb(.65,SAMPLE_RATE);
const chunkSizes=[1,17,503,4096,127];
let offset=0,block=0;
while(offset<input.length){
  const chunk=input.slice(offset,offset+chunkSizes[block++%chunkSizes.length]);
  streaming(chunk);
  assert.deepEqual(chunk,continuous.slice(offset,offset+chunk.length),'arbitrary chunk boundaries never reset or duplicate the room tail');
  offset+=chunk.length;
}
const fresh=new Float32Array(SAMPLE_RATE);createRoomReverb(1,SAMPLE_RATE)(fresh);
assert.ok(fresh.every(value=>value===0),'a new session starts without an old tail');
const sustained=new Float32Array(SAMPLE_RATE*5).fill(.5);createRoomReverb(1,SAMPLE_RATE)(sustained);
assert.ok(sustained.every(Number.isFinite),'sustained input does not destabilize the feedback');
assert.ok(sustained.subarray(SAMPLE_RATE*4).every(value=>Math.abs(value-.5)<1e-6),'the filtered return does not accumulate a DC offset');

for(const infiniteMelody of [false,true]){
  const settings={...DEFAULTS,instrument:'piano',infiniteMelody,bpm:137,volume:.1,reverb:0};
  const phrase={beats:4,events:[{beat:0,duration:1,note:pool(settings)[0]}]};
  const actual=createSequenceRenderer(settings,()=>phrase)().pcm;
  assert.deepEqual(actual,render(phrase,settings).slice(0,actual.length),'the normal playback entry point preserves dry audio at 0%');
}
for(const infiniteMelody of [false,true]){
  const settings={...DEFAULTS,infiniteMelody,bpm:137,reverb:100,metro:true,metroDuringAnswer:false};
  const phrase={beats:4,events:[]};
  const effected=createSequenceRenderer(settings,()=>phrase)().pcm;
  const bypassed=createSequenceRenderer({...settings,reverb:0},()=>phrase)().pcm;
  assert.deepEqual(effected,bypassed,'the metronome never feeds the room, including answer clicks and silence');
}
const bassSettings={...DEFAULTS,instrument:'bass',octave:3,infiniteMelody:true,bpm:180,metro:false,reverb:100};
const bassPhrase={beats:4,events:[{beat:3.5,duration:.5,note:pool(bassSettings)[0]}]};
let index=0;
const bassStream=createSequenceRenderer(bassSettings,()=>index++===0?bassPhrase:{beats:4,events:[]});
bassStream();const roomTail=bassStream().pcm;
assert.ok(roomTail.some(value=>Math.abs(value)>1e-4),'the sequencer carries the room into an otherwise silent next phrase');

for(const instrument of ['piano','bass','acousticGuitar','synth1','synth2']){
  const settings={...bassSettings,instrument};
  const note=pool(settings)[0];
  const phrases=Array.from({length:4},(_,i)=>({beats:4,events:i===0||i===2?[{beat:3.5,duration:.5,note}]:[]}));
  let phraseIndex=0;
  const stream=createSequenceRenderer(settings,()=>phrases[phraseIndex++]);
  const whole={beats:16,events:phrases.flatMap((phrase,i)=>phrase.events.map(event=>({...event,beat:event.beat+i*4})))};
  const reference=createSequenceRenderer(settings,()=>whole)().pcm;
  let sampleOffset=0,maxDifference=0;
  for(const phrase of phrases){
    const {pcm}=stream();
    for(let i=0;i<pcm.length;i++){
      assert.ok(Number.isFinite(pcm[i])&&Math.abs(pcm[i])<=.750001,'full room output remains within the final headroom limit');
      maxDifference=Math.max(maxDifference,Math.abs(pcm[i]-reference[sampleOffset+i]));
    }
    sampleOffset+=pcm.length;
  }
  assert.ok(maxDifference<1e-6,`${instrument}: 100% room matches one continuous performance`);
}
console.log(`Room reverb validated: dry bypass, amount, ${decay.toFixed(2)} s decay, stable feedback, seamless chunks, all five voices and a dry metronome.`);
