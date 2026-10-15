import {render,SAMPLE_RATE} from './render';
import type {Phrase,Settings} from './music';

export type SequenceCallbacks = {
  next:()=>Phrase;
  phrase:(phrase:Phrase)=>void;
  progress:(seconds:number)=>void;
  error:(error:unknown)=>void;
};

// Absolute sample positions prevent rounding drift. Unfinished voices carry
// into the next chunk rather than stopping at the phrase boundary.
export function createSequenceRenderer(settings:Settings,next:()=>Phrase){
  let beats=0,tail=new Float32Array(0);
  return ()=>{
    const phrase=next(),cycleBeats=phrase.beats+(settings.infiniteMelody?0:settings.answerBars*4);
    const samplesPerBeat=60/settings.bpm*SAMPLE_RATE;
    const length=Math.round((beats+cycleBeats)*samplesPerBeat)-Math.round(beats*samplesPerBeat);
    const rendered=render(phrase,settings,beats);
    for(let i=0;i<Math.min(tail.length,rendered.length);i++)rendered[i]+=tail[i];
    tail=rendered.slice(length);
    beats+=cycleBeats;
    return {phrase,pcm:rendered.slice(0,length)};
  };
}
