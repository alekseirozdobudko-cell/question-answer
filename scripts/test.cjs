const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpile(fs.readFileSync(filename,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,resolveJsonModule:true}),filename);
const {DEFAULTS,CHORDS,SCALES,LEVELS,pool,generate,rangeError,preset,tetrachordFormula,questionPlayCount}=require('../src/music.ts');
const {render,renderDrone,SAMPLE_RATE}=require('../src/render.ts');
let seed=728;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
assert.equal(pool(DEFAULTS).length,3);assert.equal(pool({...DEFAULTS,octaves:2}).length,6);assert.equal(pool({...DEFAULTS,octaves:3}).length,9);
assert.deepEqual(pool(DEFAULTS).map(n=>n.midi),[36,40,43]);
const multiRootPool=pool({...DEFAULTS,mode:'custom',root:0,customRoots:[0,4],custom:[0,4,7]});
assert.deepEqual(multiRootPool.map(n=>n.midi),[36,40,43,44,47],'selected roots combine into one deduplicated pitch pool');
assert.equal(multiRootPool.find(n=>n.midi===40)?.degree,'C:3 · E:1','shared pitches retain both chord degree labels');
assert.deepEqual(tetrachordFormula(0,0).intervals,[0,2,4,5]);
assert.deepEqual(tetrachordFormula(0,4).intervals,[7,9,11,12]);
assert.deepEqual(tetrachordFormula(0,4).degrees,['5','6','7','1']);
for(let scale=0;scale<SCALES.length;scale++)for(let start=0;start<SCALES[scale].degrees.length;start++){const t=tetrachordFormula(scale,start);assert.equal(t.intervals.length,4);assert.equal(t.degrees.length,4);assert.ok(t.intervals[3]>t.intervals[0],`tetrachord ${scale}/${start} ascends across octave`);}
assert.deepEqual(pool({...DEFAULTS,root:2,chord:8}).map(n=>[n.name,n.degree]),[['D','1'],['F','♭3'],['A','5'],['C','♭7']]);
assert.equal(pool({...DEFAULTS,mode:'scale',root:6,scale:0}).at(-1)?.name,'E♯');
assert.equal(pool({...DEFAULTS,root:11,chord:0}).at(-1)?.octave,3);
assert.ok(rangeError({...DEFAULTS,octave:1}));assert.ok(rangeError({...DEFAULTS,root:11,octaves:3}));assert.ok(rangeError({...DEFAULTS,mode:'custom',custom:[]}));
const guitarSettings={...DEFAULTS,instrument:'acousticGuitar',octave:3};
assert.equal(rangeError(guitarSettings),null,'a C3 acoustic-guitar pool fits the six-string range');
assert.ok(rangeError({...guitarSettings,octave:1}),'notes below guitar low E are rejected');
const guitarPhrase=generate({...guitarSettings,bars:1},()=>.25),guitarAudio=render(guitarPhrase,{...guitarSettings,bars:1,answerBars:1,metro:false});
assert.ok(guitarAudio.some(sample=>Math.abs(sample)>.005),'the acoustic-guitar voice renders audible plucked notes');
assert.notDeepEqual(guitarAudio,render(guitarPhrase,{...guitarSettings,instrument:'bass',bars:1,answerBars:1,metro:false}),'guitar and bass voices render differently');
const pianoSettings={...DEFAULTS,instrument:'synth2',octave:3};
assert.equal(rangeError(pianoSettings),null,'a C3 Synthesizer 2 pool fits the full keyboard range');
assert.ok(rangeError({...pianoSettings,octave:0}),'notes below Synthesizer 2 A0 are rejected');
assert.ok(rangeError({...pianoSettings,octave:8}),'notes above Synthesizer 2 C8 are rejected');
const pianoPhrase=generate({...pianoSettings,bars:1},()=>.25),synth2Audio=render(pianoPhrase,{...pianoSettings,bars:1,answerBars:1,metro:false});
assert.ok(synth2Audio.some(sample=>Math.abs(sample)>.005),'Synthesizer 2 renders audible notes');
assert.notDeepEqual(synth2Audio,guitarAudio,'Synthesizer 2 remains distinct from the acoustic guitar');
const sampledPianoSettings={...DEFAULTS,instrument:'piano',octave:3};
assert.equal(rangeError(sampledPianoSettings),null,'a C3 sampled-piano pool fits the full keyboard range');
assert.equal(Object.keys(require('../src/pianoSamples.json')).length,88,'the piano bank covers every key from A0 to C8');
const sampledPianoPhrase=generate({...sampledPianoSettings,bars:1},()=>.25),sampledPianoAudio=render(sampledPianoPhrase,{...sampledPianoSettings,bars:1,answerBars:1,metro:false});
assert.ok(sampledPianoAudio.some(sample=>Math.abs(sample)>.005),'the recorded piano sample bank renders audible notes');
assert.notDeepEqual(sampledPianoAudio,synth2Audio,'the recorded piano remains distinct from Synthesizer 2');
const synthSettings={...DEFAULTS,instrument:'synth1',octave:3};
assert.equal(rangeError(synthSettings),null,'a C3 synthesizer pool fits its full range');
const synthPhrase=generate({...synthSettings,bars:1},()=>.25),synthAudio=render(synthPhrase,{...synthSettings,bars:1,answerBars:1,metro:false});
assert.ok(synthAudio.some(sample=>Math.abs(sample)>.005),'the synthesizer voice renders audible notes');
assert.notDeepEqual(synthAudio,synth2Audio,'Synthesizer 1 remains distinct from Synthesizer 2');
let checked=0;
for(const mode of ['chord','scale','tetrachord'])for(let index=0;index<(mode==='chord'?CHORDS:SCALES).length;index++)for(let root=0;root<12;root++)for(let level=0;level<6;level++)for(const density of [2,3,6,12]){
 const s={...DEFAULTS,mode,chord:mode==='chord'?index:0,scale:mode==='scale'||mode==='tetrachord'?index:0,tetrachord:mode==='tetrachord'?index%SCALES[index].degrees.length:0,root,level,bars:4,density};
 const p=generate(s,random),allowed=pool(s).map(n=>n.midi);assert.equal(p.beats,16);assert.equal(p.events.reduce((n,e)=>n+e.duration,0),16);
 let t=0;for(const e of p.events){assert.equal(e.beat,t);assert.ok(e.duration>0);if(e.note)assert.ok(allowed.includes(e.note.midi));t+=e.duration;}
 for(let bar=0;bar<4;bar++)assert.ok(p.events.filter(e=>e.note&&Math.floor(e.beat/4)===bar).length<=density);checked++;
}
console.log(`${checked} generated phrases validated: six difficulty levels, exact bars, density, valid notes and instrument ranges.`);
const startCounts=[0,0,0],startSettings={...DEFAULTS,bars:1,level:0};
for(let i=0;i<6000;i++){const phrase=generate(startSettings,random),first=phrase.events.find(e=>e.note)?.note;assert.ok(first);startCounts[pool(startSettings).findIndex(n=>n.midi===first.midi)]++;}
assert.ok(startCounts.every(n=>n>1700&&n<2300),`first notes should start across the full chord pool, got ${startCounts.join(', ')}`);
assert.ok(LEVELS[1].includes('Плавный'));assert.deepEqual(preset(DEFAULTS,1),{...DEFAULTS,level:1,bars:1,density:3});
const q=generate({...DEFAULTS,bars:1,answerBars:2},()=>.25),silent=render(q,{...DEFAULTS,bars:1,answerBars:2,metro:false}),ticking=render(q,{...DEFAULTS,bars:1,answerBars:2,metro:true,metroDuringAnswer:true}),questionOnly=render(q,{...DEFAULTS,bars:1,answerBars:2,metro:true,metroDuringAnswer:false});
const beatSamples=Math.round(SAMPLE_RATE*60/DEFAULTS.bpm);
for(let beat=0;beat<12;beat++){const start=Math.round(beat*SAMPLE_RATE*60/DEFAULTS.bpm);let diff=0;for(let i=0;i<400;i++)diff=Math.max(diff,Math.abs(ticking[start+i]-silent[start+i]));assert.ok(diff>.01,`metronome missing on beat ${beat+1}`);}
for(let beat=0;beat<4;beat++){const start=Math.round(beat*SAMPLE_RATE*60/DEFAULTS.bpm);let diff=0;for(let i=0;i<400;i++)diff=Math.max(diff,Math.abs(questionOnly[start+i]-silent[start+i]));assert.ok(diff>.01,`metronome missing during question on beat ${beat+1}`);}
for(let beat=4;beat<12;beat++){const start=Math.round(beat*SAMPLE_RATE*60/DEFAULTS.bpm);for(let i=0;i<400;i++)assert.equal(questionOnly[start+i],silent[start+i],`metronome should be silent during answer on beat ${beat+1}`);}
const answerStart=Math.round(4*SAMPLE_RATE*60/DEFAULTS.bpm),dSettings={...DEFAULTS,root:2,drone:true,droneTone:0,volume:1},dDrone=renderDrone(dSettings);
const dMidi=12*(dSettings.octave+1)+dSettings.root,dHz=440*2**((dMidi-69)/12),analysisLength=SAMPLE_RATE;let rootRe=0,rootIm=0,wrongRe=0,wrongIm=0;
for(let i=0;i<analysisLength;i++){const angle=2*Math.PI*dHz*i/SAMPLE_RATE,wrongAngle=2*Math.PI*440*2**((48-69)/12)*i/SAMPLE_RATE;rootRe+=dDrone[i]*Math.cos(angle);rootIm+=dDrone[i]*Math.sin(angle);wrongRe+=dDrone[i]*Math.cos(wrongAngle);wrongIm+=dDrone[i]*Math.sin(wrongAngle);}
assert.equal(dDrone.length,4*SAMPLE_RATE,'continuous drone is rendered as a four-second loop');
assert.ok(2*Math.hypot(rootRe,rootIm)/analysisLength>.12,'selected D tonic is present in an audible octave');
assert.ok(Math.hypot(rootRe,rootIm)>Math.hypot(wrongRe,wrongIm)*20,'drone follows the selected tonic instead of a fixed note');
let maxStep=0;for(let i=1;i<dDrone.length;i++)maxStep=Math.max(maxStep,Math.abs(dDrone[i]-dDrone[i-1]));
assert.ok(Math.abs(dDrone[0]-dDrone.at(-1))<=maxStep*1.1,'loop boundary has no click-sized jump');
for(let droneTone=0;droneTone<3;droneTone++){const candidate=renderDrone({...dSettings,droneTone});assert.ok(candidate.every(Number.isFinite),`drone tone ${droneTone} stays finite`);assert.ok(Math.max(...candidate.slice(0,1000).map(Math.abs))>0.05,`drone tone ${droneTone} is audible`);}
assert.equal(DEFAULTS.metro,true,'metronome is enabled by default');assert.equal(DEFAULTS.metroDuringAnswer,true,'metronome remains enabled during the answer by default');
console.log('Opening notes are evenly drawn from the chosen pool. Metronome can be silenced during the answer; drone loops without a click.');
const {createSequenceRenderer}=require('../src/sequence.ts');
const sequenceSettings={...DEFAULTS,infiniteMelody:true,bpm:137,metro:true,metroDuringAnswer:false};
const sequenceNote=pool(sequenceSettings)[0];
const sequencePhrases=Array.from({length:8},(_,index)=>({beats:4,events:index%3===0?[{beat:3.5,duration:.5,note:sequenceNote}]:[]}));
const wholePhrase={beats:32,events:sequencePhrases.flatMap((phrase,index)=>phrase.events.map(event=>({...event,beat:index*4+event.beat})))};
for(const instrument of ['piano','bass','acousticGuitar','synth1','synth2']){
 const settings={...sequenceSettings,instrument};let index=0;
 const nextChunk=createSequenceRenderer(settings,()=>sequencePhrases[index++]);
 const chunks=sequencePhrases.map(()=>nextChunk().pcm);
 const whole=createSequenceRenderer(settings,()=>wholePhrase)().pcm;let offset=0,maxDifference=0;
 for(const chunk of chunks){for(let i=0;i<chunk.length;i++)maxDifference=Math.max(maxDifference,Math.abs(chunk[i]-whole[offset+i]));offset+=chunk.length;}
 assert.equal(offset,Math.round(32*60/settings.bpm*SAMPLE_RATE),'phrase boundaries retain the exact cumulative musical duration');
 assert.ok(maxDifference<1e-6,`${instrument}: streaming and one continuous render must match, difference ${maxDifference}`);
}
const silentSettings={...sequenceSettings,instrument:'piano',metro:false,bpm:180};let silentIndex=0;
const decayStream=createSequenceRenderer(silentSettings,()=>silentIndex++===0?{beats:4,events:[{beat:3.5,duration:.5,note:sequenceNote}]}:{beats:4,events:[]});
decayStream();const continuedDecay=decayStream().pcm;
assert.ok(continuedDecay.some(value=>Math.abs(value)>.001),'piano decay continues into a following phrase with no notes');
console.log('All five voices match a continuous render across eight chunks; piano tails survive phrase boundaries.');
const denseSettings={...sequenceSettings,instrument:'piano',bpm:180,volume:1,drone:true};
const densePhrases=Array.from({length:12},()=>({beats:4,events:Array.from({length:12},(_,i)=>({beat:i/4,duration:.25,note:sequenceNote}))}));
const denseWhole={beats:48,events:densePhrases.flatMap((phrase,index)=>phrase.events.map(event=>({...event,beat:index*4+event.beat})))};
const denseReference=createSequenceRenderer(denseSettings,()=>denseWhole)().pcm;
let denseIndex=0,denseOffset=0,limited=false;
const denseStream=createSequenceRenderer(denseSettings,()=>densePhrases[denseIndex++]);
const rawDense=render(denseWhole,denseSettings);
let dronePeak=0;
for(const value of renderDrone(denseSettings))dronePeak=Math.max(dronePeak,Math.abs(value));
for(let block=0;block<densePhrases.length;block++){
 const {pcm}=denseStream();
 for(let i=0;i<pcm.length;i++){
  assert.ok(Math.abs(pcm[i])<=.750001,'dense piano overlap leaves headroom for the drone');
  assert.ok(Math.abs(pcm[i]-denseReference[denseOffset+i])<1e-6,'limiter gain remains continuous across phrase boundaries');
  if(Math.abs(rawDense[denseOffset+i])>.76)limited=true;
 }
 denseOffset+=pcm.length;
}
assert.ok(limited,'regression exercises overlapping piano peaks above the output ceiling');
assert.ok(.750001+dronePeak<1,'the melody and tonic drone fit within the output range together');
console.log('Dense piano playback stays below the output ceiling, including note tails and the tonic drone.');
assert.equal(DEFAULTS.questionPlays,1,'existing practice starts with one question playback');
for(const invalid of [undefined,null,0,-1,1.5,9,Infinity,NaN,'3']){
 assert.equal(questionPlayCount({...DEFAULTS,questionPlays:invalid}),1,'missing or invalid saved playback counts fall back to one');
}
for(let plays=1;plays<=8;plays++)for(const infiniteMelody of [false,true]){
 const settings={...DEFAULTS,questionPlays:plays,infiniteMelody,bpm:137,answerBars:2,metro:true,metroDuringAnswer:false};
 assert.equal(questionPlayCount(settings),plays);
 const next=createSequenceRenderer(settings,()=>({beats:4,events:[]}));
 const listeningBeats=4*plays,cycleBeats=listeningBeats+(infiniteMelody?0:8);
 let offset=0;
 for(let cycle=0;cycle<2;cycle++){
  const {pcm}=next();offset+=pcm.length;
  assert.equal(offset,Math.round((cycle+1)*cycleBeats*60/settings.bpm*SAMPLE_RATE),'all repetitions and exactly one answer pause retain musical timing');
  const sampleAt=beat=>Math.round((cycle*cycleBeats+beat)*60/settings.bpm*SAMPLE_RATE)-Math.round(cycle*cycleBeats*60/settings.bpm*SAMPLE_RATE);
  for(let beat=0;beat<listeningBeats;beat++){
   let peak=0;const start=sampleAt(beat);
   for(let i=0;i<600&&start+i<pcm.length;i++)peak=Math.max(peak,Math.abs(pcm[start+i]));
   assert.ok(peak>.01,'metronome remains active throughout every question repetition');
  }
  if(!infiniteMelody)assert.ok(pcm.subarray(sampleAt(listeningBeats)).every(value=>value===0),'the silent answer starts only after the final repetition');
 }
}
const repeatedPhrase={beats:4,events:[{beat:0,duration:1,note:sequenceNote},{beat:1,duration:2.5,note:null},{beat:3.5,duration:.5,note:sequenceNote}]};
const repeatedReference={beats:12,events:[0,4,8].flatMap(offset=>repeatedPhrase.events.map(event=>({...event,beat:event.beat+offset})))};
for(const instrument of ['piano','bass','acousticGuitar','synth1','synth2'])for(const infiniteMelody of [false,true]){
 const settings={...DEFAULTS,instrument,questionPlays:3,infiniteMelody,bpm:137,answerBars:1,metro:true,metroDuringAnswer:false};
 let generated=0;
 const stream=createSequenceRenderer(settings,()=>{generated++;return repeatedPhrase;});
 const actual=stream();
 assert.equal(generated,1,'repetitions reuse the same generated phrase');
 assert.equal(actual.phrase,repeatedPhrase,'history and note display retain the original phrase');
 assert.equal(actual.phrase.events.length,3,'repeated audio never changes the displayed notes');
 const reference=createSequenceRenderer({...settings,questionPlays:1},()=>repeatedReference)().pcm;
 assert.equal(actual.pcm.length,reference.length);
 let difference=0;
 for(let i=0;i<reference.length;i++)difference=Math.max(difference,Math.abs(actual.pcm[i]-reference[i]));
 assert.ok(difference<1e-6,`${instrument}: repeated question audio matches a continuous performance, including decays`);
 stream();assert.equal(generated,2,'a fresh question is requested after each complete set of repetitions');
}
console.log('Question playback counts 1–8 validated in both modes: same phrase, continuous tails, final answer pause, metronome and legacy settings.');
require('./test-playback.cjs');
require('./test-updates.cjs');
