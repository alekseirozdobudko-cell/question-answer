import { SAMPLE_RATE, render, renderDrone } from './render';
import type { Settings, Phrase } from './music';
let context: AudioContext;
export type Prepared = { buffer: AudioBuffer };
export async function initialize() { context??=new AudioContext();await context.resume(); }
export function prepare(phrase: Phrase,settings: Settings): Prepared {
  const pcm=render(phrase,settings), buffer=context.createBuffer(1,pcm.length,SAMPLE_RATE);buffer.getChannelData(0).set(pcm);return {buffer};
}
export function startDrone(settings: Settings) {
  const pcm=renderDrone(settings),buffer=context.createBuffer(1,pcm.length,SAMPLE_RATE);buffer.getChannelData(0).set(pcm);
  const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(context.destination);source.start();
  let stopped=false;
  return ()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}source.disconnect();};
}
export function dispose(_p: Prepared) {}
export function play(p: Prepared,progress:(seconds:number)=>void,done:()=>void) {
  const source=context.createBufferSource();source.buffer=p.buffer;source.connect(context.destination);
  const start=context.currentTime;let stopped=false;source.start(start);
  const timer=setInterval(()=>progress(context.currentTime-start),40);
  source.onended=()=>{clearInterval(timer);source.disconnect();if(!stopped)done();};
  return ()=>{stopped=true;clearInterval(timer);source.onended=null;try{source.stop();}catch{}source.disconnect();};
}
