import {render,prepareSamples,mixMetronome,SAMPLE_RATE} from './render';
import {questionPlayCount,reverbAmount,type Phrase,type Settings} from './music';
import {createRoomReverb} from './reverb';

export type SequenceCallbacks = {
  next:()=>Phrase;
  phrase:(phrase:Phrase)=>void;
  progress:(seconds:number)=>void;
  error:(error:unknown)=>void;
};

// Absolute sample positions prevent rounding drift. Unfinished voices carry
// into the next chunk rather than stopping at the phrase boundary.
export function createSequenceRenderer(settings:Settings,next:()=>Phrase){
  prepareSamples(settings);
  const instrumentSettings={...settings,metro:false};
  const applyReverb=createRoomReverb(reverbAmount(settings)/100,SAMPLE_RATE);
  let beats=0,tail=new Float32Array(0);
  let outputGain=1;
  const release=1-Math.exp(-1/(SAMPLE_RATE*.08));
  return ()=>{
    const phrase=next();
    const plays=questionPlayCount(settings);
    // Keep the original phrase for history and note display. Render its
    // repetitions together so the answer pause follows the final pass.
    const audioPhrase:Phrase={
      beats:phrase.beats*plays,
      events:Array.from({length:plays},(_,repetition)=>
        phrase.events.map(event=>({...event,beat:event.beat+repetition*phrase.beats}))
      ).flat(),
    };
    const cycleBeats=audioPhrase.beats+(settings.infiniteMelody?0:settings.answerBars*4);
    const samplesPerBeat=60/settings.bpm*SAMPLE_RATE;
    const length=Math.round((beats+cycleBeats)*samplesPerBeat)-Math.round(beats*samplesPerBeat);
    const rendered=render(audioPhrase,instrumentSettings,beats);
    for(let i=0;i<Math.min(tail.length,rendered.length);i++)rendered[i]+=tail[i];
    tail=rendered.slice(length);
    const pcm=rendered.slice(0,length);
    // Feed only samples that are actually emitted into the room. Raw note
    // tails stay separate, while the room's delay lines span every chunk.
    applyReverb(pcm);
    mixMetronome(pcm,audioPhrase,settings,beats);
    beats+=cycleBeats;
    // Limit the completed mix, after carrying the unprocessed note tails.
    // Gain persists across chunks and releases over 80 ms. The 0.75 ceiling
    // leaves headroom for the separately playing tonic drone on every platform.
    for(let i=0;i<pcm.length;i++){
      const target=.75/Math.max(.75,Math.abs(pcm[i]));
      outputGain=target<outputGain?target:outputGain+(target-outputGain)*release;
      pcm[i]*=outputGain;
    }
    return {phrase,pcm};
  };
}
