const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const ts=require('typescript');
const {DEFAULTS,pool}=require('../src/music.ts');
const {SAMPLE_RATE}=require('../src/render.ts');

function loadAudio(file,mocks,globals){
 const filename=path.resolve(__dirname,'../src',file),realRequire=createRequire(filename),exports={};
 const source=ts.transpile(fs.readFileSync(filename,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022});
 vm.runInNewContext(source,{exports,require:name=>name in mocks?mocks[name]:realRequire(name),...globals},{filename});
 return exports;
}
const settings={...DEFAULTS,infiniteMelody:true,bpm:137,metro:false};
let phraseId=0;
const next=()=>({beats:4,events:[],id:phraseId++});
const chunk=()=>({phrase:next(),pcm:new Float32Array(SAMPLE_RATE)});
const mockSequence={'./sequence':{createSequenceRenderer:()=>chunk}};

async function test(){
 const pianoSettings={...settings,instrument:'piano'},decoded=new Map();
 const pianoBank=Object.fromEntries(pool(pianoSettings).map(note=>[note.midi,{
  *[Symbol.iterator](){decoded.set(note.midi,(decoded.get(note.midi)??0)+1);yield* 'AAA=';}
 }]));
 const sampleRenderer=loadAudio('render.ts',{'./samples.json':{},'./pianoSamples.json':pianoBank},{});
 sampleRenderer.prepareSamples(pianoSettings);
 for(const note of pool(pianoSettings))assert.equal(decoded.get(note.midi),1,'all selectable piano keys are decoded before playback');
 sampleRenderer.render({beats:4,events:pool(pianoSettings).map((note,beat)=>({beat,duration:1,note}))},pianoSettings);
 sampleRenderer.prepareSamples(pianoSettings);
 assert.ok([...decoded.values()].every(count=>count===1),'rendering and subsequent starts reuse the prepared piano samples');
 let tick,sources=[];
 class Context{
  constructor(){this.currentTime=0;this.destination={};Context.instance=this;}
  resume(){return Promise.resolve();}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){const source={connect(){},disconnect(){},start(at){this.at=at;},stop(){this.stopped=true;}};sources.push(source);return source;}
 }
 const web=loadAudio('audio.web.ts',mockSequence,{AudioContext:Context,setInterval:fn=>(tick=fn,1),clearInterval:()=>{tick=undefined;}});
 await web.initialize();let seen=[],errors=[];
 const stop=web.playSequence(settings,{next,phrase:p=>seen.push(p.id),progress(){},error:e=>errors.push(e)});
 assert.equal(sources.length,3,'browser schedules a lookahead before playback');
 for(let boundary=1;boundary<=20;boundary++){
  Context.instance.currentTime=boundary+.06;tick();
  assert.equal(seen.length,boundary+1,'UI follows the audio clock at every boundary');
  assert.equal(sources.at(-1).at,sources.at(-2).at+1,'successor starts at the exact previous endpoint');
 }
 assert.equal(errors.length,0);stop();stop();assert.equal(tick,undefined);
 assert.ok(sources.slice(-3).every(source=>source.stopped),'stop cancels all queued browser audio');
 const lateStop=web.playSequence(settings,{next,phrase(){},progress(){},error:e=>errors.push(e)});
 Context.instance.currentTime+=10;tick();assert.equal(errors.length,1,'an underrun reports an error and stops');lateStop();

 let pending,startup,playlist,files=new Set(),created=0;
 class File{
  constructor(root,name){this.uri=name;}
  create(){files.add(this.uri);}
  write(){}
  delete(){files.delete(this.uri);}
 }
 const nativeMocks={
  ...mockSequence,
  'expo-file-system':{File,Paths:{cache:'cache'}},
  'expo-audio':{setAudioModeAsync:async()=>{},createAudioPlaylist:options=>{
   created++;playlist={sources:[...options.sources],currentIndex:0,currentTime:0,isLoaded:false,isBuffering:true,currentStatus:{},
    addListener(event,listener){this.listener=listener;return {remove:()=>{this.listener=undefined;}};},
    add(source){this.sources.push(source);},remove(index){this.sources.splice(index,1);this.currentIndex--;},
    play(){this.playing=true;},clear(){this.playing=false;this.sources=[];},destroy(){this.destroyed=true;},release(){this.released=true;}
   };return playlist;
  }}
 };
 nativeMocks['./audio-native']=loadAudio('audio-native.ts',nativeMocks,{});
 const native=loadAudio('audio.android.ts',nativeMocks,{setTimeout:(fn,ms)=>ms===10000?(startup=fn,2):(pending=fn,1),clearTimeout:id=>{if(id===2)startup=undefined;else if(id===1)pending=undefined;}});
 seen=[];errors=[];
 const nativeStop=native.playSequence(settings,{next,phrase:p=>seen.push(p.id),progress(){},error:e=>errors.push(e)});
 assert.equal(seen.length,0,'the first phrase stays in loading state until native audio is ready');
 assert.ok(!playlist.playing,'playback must not start while the initial source is loading');
 playlist.isLoaded=true;playlist.listener({});
 assert.ok(!playlist.playing,'a loaded but still buffering source must not start');
 playlist.isBuffering=false;playlist.listener({});
 assert.equal(seen.length,1);assert.ok(playlist.playing);assert.equal(startup,undefined);
 for(let boundary=1;boundary<=20;boundary++){
  playlist.currentIndex=1;playlist.listener({currentIndex:1,currentTime:0});
  const maintain=pending;pending=undefined;maintain();
  // A status emitted before pruning must not announce a future phrase.
  playlist.listener({currentIndex:1,currentTime:0});
  assert.equal(seen.length,boundary+1);
  assert.equal(playlist.sources.length,3,'native queue stays bounded');
  assert.equal(files.size,3,'consumed WAV files are deleted');
 }
 assert.equal(created,1,'phrase boundaries never create another native player');
 assert.equal(errors.length,0);nativeStop();nativeStop();
 assert.ok(playlist.released&&playlist.destroyed&&!playlist.playing,'stop releases the native player');
 assert.equal(files.size,0,'stop deletes all temporary audio files');
 assert.equal(pending,undefined);
 const waitingStop=native.playSequence(settings,{next,phrase(){throw new Error('Cancelled startup must never announce a phrase');},progress(){},error:e=>errors.push(e)});
 const staleListener=playlist.listener;waitingStop();playlist.isLoaded=true;playlist.isBuffering=false;staleListener({});
 assert.ok(!playlist.playing);assert.equal(files.size,0);assert.equal(startup,undefined);
 native.playSequence(settings,{next,phrase(){},progress(){},error:e=>errors.push(e)});
 const startupTimeout=startup;startupTimeout();
 assert.equal(errors.length,1,'a player that never becomes ready reports an error');assert.equal(files.size,0);
 console.log('Playback validated: prepared piano keys, native readiness, startup cancellation/timeout, 20 transitions and resource cleanup.');
}
test().catch(error=>{console.error(error);process.exitCode=1;});
