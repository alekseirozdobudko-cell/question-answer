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

 let pending,startup,playlist,files=new Map(),created=0;
 let queuedFileDeletes=[],nativeRenderHook,failWrites=false;
 class File{
  constructor(root,name){this.uri=name;}
  get exists(){return files.has(this.uri);}
  create(){files.set(this.uri,new Uint8Array());}
  // Model SDK 58's background write as unfinished when the player opens a URI.
  write(){return new Promise(()=>{});}
  writeSync(content){
   if(failWrites)throw new Error('Disk write failed');
   files.set(this.uri,typeof content==='string'?content:Uint8Array.from(content));
  }
  textSync(){return files.get(this.uri);}
  delete(){
   if(playlist?.sources.some(source=>source.uri===this.uri))queuedFileDeletes.push(this.uri);
   files.delete(this.uri);
  }
 }
 function assertWaveSource(source){
  const bytes=files.get(source.uri);
  assert.ok(bytes instanceof Uint8Array&&bytes.length>44,'native player only receives a completely written WAV');
  const data=Buffer.from(bytes);
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
  assert.equal(data.readUInt32LE(4)+8,data.length,'RIFF size matches the actual file');
  assert.equal(data.readUInt16LE(20),1,'PCM format');assert.equal(data.readUInt16LE(22),1,'mono');
  assert.equal(data.readUInt32LE(24),SAMPLE_RATE);assert.equal(data.readUInt16LE(34),16);
  assert.equal(data.toString('ascii',36,40),'data');
  assert.equal(data.readUInt32LE(40)+44,data.length,'PCM data is complete before queue insertion');
 }
 const nativeMocks={
  ...mockSequence,
  './sequence':{createSequenceRenderer:()=>()=>{nativeRenderHook?.();return chunk();}},
  'expo-file-system':{File,Paths:{cache:'cache',document:'document'}},
  'expo-audio':{setAudioModeAsync:async()=>{},createAudioPlaylist:options=>{
   options.sources.forEach(assertWaveSource);
   created++;playlist={sources:[...options.sources],currentIndex:0,currentTime:0,isLoaded:false,isBuffering:true,currentStatus:{},
    addListener(event,listener){this.listener=listener;return {remove:()=>{this.listener=undefined;}};},
    add(source){assertWaveSource(source);this.sources.push(source);},remove(index){this.sources.splice(index,1);this.currentIndex--;},
    play(){this.playing=true;},clear(){this.playing=false;this.sources=[];},destroy(){this.destroyed=true;},release(){this.released=true;}
   };return playlist;
  }}
 };
 nativeMocks['./audio-native']=loadAudio('audio-native.ts',nativeMocks,{});
 const completeFile=nativeMocks['./audio-native'].audioFile(new Float32Array([0,.25,-.25]));
 assertWaveSource({uri:completeFile.uri});completeFile.delete();
 failWrites=true;
 assert.throws(()=>nativeMocks['./audio-native'].audioFile(new Float32Array(4)),/Disk write failed/);
 assert.equal(files.size,0,'a failed synchronous write removes its incomplete audio file');
 failWrites=false;
 const storage=loadAudio('storage.ts',nativeMocks,{});
 storage.writeSettings({bpm:80});storage.writeSettings({bpm:120});
 assert.equal(storage.readSettings().bpm,120,'settings writes complete in order before the next read');
 files.clear();
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
  playlist.currentIndex++;
  const transitionIndex=playlist.currentIndex;
  playlist.listener({currentIndex:transitionIndex,currentTime:0});
  const maintain=pending;pending=undefined;maintain();
  // A status emitted before pruning must not announce a future phrase.
  playlist.listener({currentIndex:transitionIndex,currentTime:0});
  assert.equal(seen.length,boundary+1);
  assert.equal(playlist.sources.length,3,'native queue retains the current track and two future tracks');
  assert.equal(files.size,3,'consumed WAV files are removed with bounded storage');
  assert.equal(queuedFileDeletes.length,0,'queued audio files are never deleted');
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
 seen=[];errors=[];
 const advancingStop=native.playSequence(settings,{next,phrase:p=>seen.push(p.id),progress(){},error:e=>errors.push(e)});
 playlist.isLoaded=true;playlist.isBuffering=false;playlist.listener({});
 playlist.currentIndex=1;playlist.listener({});
 nativeRenderHook=()=>{nativeRenderHook=undefined;playlist.currentIndex=2;};
 let refill=pending;pending=undefined;refill();
 playlist.listener({currentIndex:1});
 assert.equal(seen.length,3,'live cursor catches a second transition during audio generation');
 refill=pending;pending=undefined;refill();
 playlist.listener({currentIndex:2});
 assert.equal(seen.length,3,'a delayed status after pruning never advances the phrase again');
 assert.equal(playlist.currentIndex,0);assert.equal(playlist.sources.length,3);
 assert.equal(errors.length,0);advancingStop();assert.equal(files.size,0);
 native.playSequence(settings,{next,phrase(){},progress(){},error:e=>errors.push(e)});
 const failedListener=playlist.listener;
 failedListener({error:{message:'Source error',code:3003}});
 failedListener({error:{message:'Source error',code:3003}});
 assert.equal(errors.length,1,'a native source failure is reported once through the app error handler');
 assert.equal(errors[0].message,'Source error');assert.equal(files.size,0);assert.ok(playlist.released);
 console.log('Playback validated: completed WAV writes, ordered settings writes, prepared piano keys, native readiness, startup cancellation/timeout, 20 transitions, advancement during rendering, native errors and resource cleanup.');
}
test().catch(error=>{console.error(error);process.exitCode=1;});
