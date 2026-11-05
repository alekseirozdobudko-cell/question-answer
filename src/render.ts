import samples from './samples.json';
import pianoSamples from './pianoSamples.json';
import {pool,type Phrase,type Settings} from './music';
export const SAMPLE_RATE=22050;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decode(base64: string) {
  const bytes: number[]=[]; let bits=0,value=0;
  for(const c of base64) {const n=alphabet.indexOf(c); if(n<0) continue; value=(value<<6)|n;bits+=6;if(bits>=8){bits-=8;bytes.push((value>>bits)&255);}}
  const pcm=new Float32Array(bytes.length/2);
  for(let i=0;i<pcm.length;i++){let v=bytes[i*2]|bytes[i*2+1]<<8;pcm[i]=(v>=32768?v-65536:v)/32768;}
  return pcm;
}
const bank = Object.entries(samples).map(([midi,pcm])=>({midi:Number(midi),pcm:decode(pcm)}));
const pianoBank=pianoSamples as Record<string,string>;
const pianoCache=new Map<number,Float32Array>();
function pianoSample(midi:number):Float32Array|undefined {
  const encoded=pianoBank[String(midi)];if(!encoded)return undefined;
  let pcm=pianoCache.get(midi);if(!pcm){pcm=decode(encoded);pianoCache.set(midi,pcm)}
  return pcm;
}

// Settings stay fixed during playback. Decode every playable piano key while
// the app is still preparing, never on its first occurrence in a live phrase.
export function prepareSamples(settings:Settings){
  if(settings.instrument==='piano')for(const note of pool(settings))pianoSample(note.midi);
}

// A self-contained Karplus–Strong plucked-string model keeps the acoustic-guitar
// voice free of bundled third-party recordings while providing a natural decay.
function pluck(midi:number, length:number, seed:number):Float32Array {
  const hz=440*2**((midi-69)/12), delay=Math.max(8,Math.round(SAMPLE_RATE/hz));
  const ring=new Float32Array(delay);let state=(seed|0)||1;
  for(let i=0;i<delay;i++){state=(Math.imul(state,1664525)+1013904223)|0;ring[i]=((state>>>0)/2147483648-1)*(1-i/delay*.18);}
  const out=new Float32Array(length);let cursor=0;
  for(let i=0;i<length;i++){
    const value=ring[cursor],next=(cursor+1)%delay;
    ring[cursor]=(value+ring[next])*.497;
    cursor=next;
    const attack=Math.min(1,i/25),decay=Math.exp(-i/(SAMPLE_RATE*2.5));
    // A quiet pair of inharmonic body resonances adds the rounded wooden color.
    const t=i/SAMPLE_RATE;
    const body=(Math.sin(2*Math.PI*110*t)*Math.exp(-t*3)+Math.sin(2*Math.PI*205*t)*Math.exp(-t*4))*.035;
    out[i]=(value*attack+body*decay)*decay;
  }
  return out;
}
// Synthesizer 1: additive partials with a soft attack and sustained decay.
function synth1Tone(midi:number,length:number):Float32Array {
  const hz=440*2**((midi-69)/12), inharmonicity=Math.min(.001,.000025*2**((midi-48)/24));
  const weights=[1,.68,.48,.34,.25,.19,.145,.112,.087,.067,.052,.04,.031,.024,.018,.014,.011,.008];
  const phases=new Float64Array(weights.length),steps=new Float64Array(weights.length),envelopes=new Float64Array(weights.length),decays=new Float64Array(weights.length);
  const unisonPhases=new Float64Array(weights.length),unisonSteps=new Float64Array(weights.length);
  const baseTau=Math.max(.8,Math.min(6,3.4*2**((60-midi)/48)));
  let usable=0;
  for(let n=1;n<=weights.length;n++){
    const partial=hz*n*Math.sqrt(1+inharmonicity*n*n);if(partial>=SAMPLE_RATE*.48)break;
    steps[n-1]=2*Math.PI*partial/SAMPLE_RATE;
    unisonSteps[n-1]=steps[n-1]*(midi>=48?1.0012:1);
    envelopes[n-1]=1;
    decays[n-1]=Math.exp(-1/(SAMPLE_RATE*baseTau/(1+(n-1)*.52)));
    usable++;
  }
  const out=new Float32Array(length);let noiseState=(midi*2654435761)|0;
  for(let i=0;i<length;i++){
    let sample=0;
    for(let p=0;p<usable;p++){
      const blend=midi>=48&&p<7?.78:1;
      sample+=weights[p]*envelopes[p]*(blend*Math.sin(phases[p])+(1-blend)*Math.sin(unisonPhases[p]));
      phases[p]+=steps[p];unisonPhases[p]+=unisonSteps[p];envelopes[p]*=decays[p];
    }
    noiseState=(Math.imul(noiseState,1664525)+1013904223)|0;
    const t=i/SAMPLE_RATE,attack=1-Math.exp(-t*950);
    const hammer=(((noiseState>>>0)/2147483648)-1)*.012*Math.exp(-t*1100);
    out[i]=(sample*.31+hammer)*attack;
  }
  return out;
}
// Synthesizer 2: hammer transient, stiff-string partials, unison strings,
// pitch-dependent decay, and a short damper release after key-up.
function synth2Tone(midi:number,length:number,keyOff:number):Float32Array {
  const hz=440*2**((midi-69)/12), inharmonicity=Math.min(.0012,.000018*2**((midi-48)/22));
  const weights=[1,.72,.52,.38,.28,.21,.16,.12,.091,.069,.052,.039,.029,.021,.015,.011,.008,.0058,.0042,.003];
  const detunes=midi<40?[0]:midi<56?[-.00065,.00065]:[-.00115,0,.00115];
  const phases=detunes.map(()=>new Float64Array(weights.length));
  const steps=detunes.map(detune=>new Float64Array(weights.length));
  const envelopes=new Float64Array(weights.length),decays=new Float64Array(weights.length);
  const baseTau=Math.max(1.15,Math.min(7,4.3*2**((60-midi)/46)));
  let usable=0;
  for(let n=1;n<=weights.length;n++){
    const partial=hz*n*Math.sqrt(1+inharmonicity*n*n);if(partial>=SAMPLE_RATE*.48)break;
    for(let string=0;string<detunes.length;string++)steps[string][n-1]=2*Math.PI*partial*(1+detunes[string])/SAMPLE_RATE;
    envelopes[n-1]=1;
    decays[n-1]=Math.exp(-1/(SAMPLE_RATE*baseTau/(1+(n-1)*.48)));
    usable++;
  }
  const out=new Float32Array(length);let noiseState=(midi*2654435761)|0;
  for(let i=0;i<length;i++){
    let tone=0;
    for(let p=0;p<usable;p++){
      for(let string=0;string<detunes.length;string++){
        tone+=weights[p]*envelopes[p]*Math.sin(phases[string][p])/detunes.length;
        phases[string][p]+=steps[string][p];
      }
      envelopes[p]*=decays[p];
    }
    noiseState=(Math.imul(noiseState,1664525)+1013904223)|0;
    const t=i/SAMPLE_RATE,attack=1-Math.exp(-t*1250);
    const hammer=(((noiseState>>>0)/2147483648)-1)*.025*Math.exp(-t*900);
    const damping=i<keyOff?1:Math.exp(-(i-keyOff)/(SAMPLE_RATE*.12));
    out[i]=(tone*.28+hammer)*attack*damping;
  }
  return out;
}
export function render(phrase: Phrase,s: Settings,beatOffset=0): Float32Array {
  const spb=60/s.bpm, totalBeats=phrase.beats+(s.infiniteMelody?0:s.answerBars*4);
  const samplesPerBeat=spb*SAMPLE_RATE;
  const sampleAt=(beat:number)=>Math.round((beatOffset+beat)*samplesPerBeat)-Math.round(beatOffset*samplesPerBeat);
  // Piano recordings last at most five seconds. Preserve their complete decay.
  const tail=s.infiniteMelody?5*SAMPLE_RATE:0;
  const out=new Float32Array(sampleAt(totalBeats)+tail);
  for(const event of phrase.events) {
    if(!event.note) continue;
    const midi=event.note.midi;
    const start=sampleAt(event.beat);
    const length=Math.floor(event.duration*spb*SAMPLE_RATE*.92);
    if(s.instrument==='acousticGuitar'){
      const voice=pluck(midi,length,Math.round(midi*997+(beatOffset+event.beat)*1009));
      for(let i=0;i<length;i++)out[start+i]+=voice[i]*Math.min(1,i/50,(length-i)/350)*s.volume*.85;
      continue;
    }
    if(s.instrument==='synth1'){
      const voice=synth1Tone(midi,length);
      for(let i=0;i<length;i++)out[start+i]+=voice[i]*Math.min(1,i/18,(length-i)/350)*s.volume*.9;
      continue;
    }
    if(s.instrument==='synth2'){
      const release=Math.floor(SAMPLE_RATE*.24),voice=synth2Tone(midi,length+release,length);
      for(let i=0;i<voice.length&&start+i<out.length;i++)out[start+i]+=voice[i]*s.volume*.9;
      continue;
    }
    if(s.instrument==='piano'){
      const pcm=pianoSample(midi);if(!pcm)continue;
      const sampleLength=Math.min(pcm.length,out.length-start);
      for(let i=0;i<sampleLength;i++)out[start+i]+=pcm[i]*Math.min(1,i/12)*s.volume*.9;
      continue;
    }

    const source=bank.reduce((a,b)=>Math.abs(b.midi-midi)<Math.abs(a.midi-midi)?b:a);
    const rate=2**((midi-source.midi)/12);
    const sampleLength=Math.min(length,Math.floor((source.pcm.length-1)/rate));
    for(let i=0;i<sampleLength;i++) {
      const p=i*rate,k=Math.floor(p), frac=p-k;
      const gain=Math.min(1,i/60,(length-i)/350)*s.volume*.85;
      out[start+i]+=(source.pcm[k]*(1-frac)+source.pcm[k+1]*frac)*gain;
    }
  }
  for(let beat=0;beat<totalBeats;beat++) {
    if(!s.metro||(beat>=phrase.beats&&!s.metroDuringAnswer)) continue;
    const start=sampleAt(beat), hz=beat%4===0?1500:1000;
    for(let i=0;i<600&&start+i<out.length;i++) out[start+i]+=Math.sin(2*Math.PI*hz*i/SAMPLE_RATE)*Math.exp(-i/100)*.2*s.volume;
  }
  return out;
}
export function renderDrone(s: Settings): Float32Array {
  const seconds=4,length=seconds*SAMPLE_RATE;
  const rootMidi=12*(s.octave+1)+s.root, targetHz=440*2**((rootMidi-69)/12);
  const cycles=Math.round(targetHz*seconds);
  const partials=s.droneTone===0?[1,0,0,0,0]:s.droneTone===2?[.64,0,.22,.1,.04]:[.7,.2,.07,.025,0];
  const pcm=new Float32Array(length);
  for(let i=0;i<length;i++) {
    const phase=2*Math.PI*cycles*i/length;
    let wave=0;
    for(let n=0;n<partials.length;n++) if(partials[n]) wave+=partials[n]*Math.sin(phase*(n+1));
    const breathing=1+.025*Math.sin(2*Math.PI*i/length);
    pcm[i]=wave*.22*s.volume*breathing;
  }
  return pcm;
}
export function wav(pcm: Float32Array): Uint8Array {
  const bytes=new Uint8Array(44+pcm.length*2), view=new DataView(bytes.buffer);
  const str=(at:number,s:string)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
  str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,SAMPLE_RATE,true);view.setUint32(28,SAMPLE_RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,pcm.length*2,true);
  for(let i=0;i<pcm.length;i++) view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),true);
  return bytes;
}
