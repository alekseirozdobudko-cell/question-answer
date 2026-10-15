import {SAMPLE_RATE,renderDrone} from './render';
import {createSequenceRenderer,type SequenceCallbacks} from './sequence';
import type {Settings} from './music';
let context:AudioContext;
export async function initialize(){context??=new AudioContext();await context.resume();}
function buffer(pcm:Float32Array){
  const result=context.createBuffer(1,pcm.length,SAMPLE_RATE);
  result.getChannelData(0).set(pcm);return result;
}
export function startDrone(settings:Settings){
  const source=context.createBufferSource();source.buffer=buffer(renderDrone(settings));
  source.loop=true;source.connect(context.destination);source.start();
  let stopped=false;
  return ()=>{if(stopped)return;stopped=true;source.stop();source.disconnect();};
}
export function playSequence(settings:Settings,callbacks:SequenceCallbacks){
  const renderNext=createSequenceRenderer(settings,callbacks.next);
  const chunks:Array<{phrase:ReturnType<typeof renderNext>['phrase'];source:AudioBufferSourceNode;start:number;end:number}>=[];
  let stopped=false,timer:ReturnType<typeof setInterval>|undefined;
  const stop=()=>{
    if(stopped)return;stopped=true;clearInterval(timer);
    for(const chunk of chunks){chunk.source.onended=null;try{chunk.source.stop();}catch{}chunk.source.disconnect();}
    chunks.length=0;
  };
  const append=(chunk:ReturnType<typeof renderNext>,start:number)=>{
    const source=context.createBufferSource();source.buffer=buffer(chunk.pcm);source.connect(context.destination);
    source.onended=()=>source.disconnect();
    const end=start+chunk.pcm.length/SAMPLE_RATE;
    chunks.push({phrase:chunk.phrase,source,start,end});source.start(start);
  };
  try{
    const initial=[renderNext(),renderNext(),renderNext()];
    let start=context.currentTime+.05;
    for(const chunk of initial){append(chunk,start);start=chunks.at(-1)!.end;}
    callbacks.phrase(chunks[0].phrase);
    timer=setInterval(()=>{
      if(stopped)return;
      try{
        const now=context.currentTime;
        if(now>=chunks.at(-1)!.end)throw new Error('Не удалось вовремя подготовить звук. Запусти практику ещё раз.');
        while(chunks.length>1&&now>=chunks[1].start){chunks.shift();callbacks.phrase(chunks[0].phrase);}
        callbacks.progress(Math.max(0,now-chunks[0].start));
        while(chunks.length<3){const chunk=renderNext(),start=chunks.at(-1)!.end;
          if(context.currentTime>=start)throw new Error('Не удалось вовремя подготовить звук. Запусти практику ещё раз.');
          append(chunk,start);
        }
      }catch(error){stop();callbacks.error(error);}
    },40);
    return stop;
  }catch(error){stop();throw error;}
}
