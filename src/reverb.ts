// Freeverb-style mono room: eight damped feedback combs, followed by
// four allpass diffusers. One instance owns the tail for a whole session.
export function createRoomReverb(amount:number,sampleRate:number){
  if(amount===0)return (_pcm:Float32Array)=>{};

  const predelay=new Float32Array(Math.round(sampleRate*.012));
  let predelayIndex=0,previousInput=0,highpass=0;
  const highpassFeedback=Math.exp(-2*Math.PI*150/sampleRate);
  const damping=Math.exp(-2*Math.PI*4500/sampleRate);
  const combs=[1116,1188,1277,1356,1422,1491,1557,1617].map(tuning=>{
    const length=Math.round(tuning*sampleRate/44100);
    return {
      buffer:new Float32Array(length),
      index:0,
      lowpass:0,
      // Equalize the decay of the different delay lines to about one second.
      feedback:Math.pow(.001,length/sampleRate),
    };
  });
  const diffusers=[556,441,341,225].map(tuning=>({
    buffer:new Float32Array(Math.round(tuning*sampleRate/44100)),
    index:0,
  }));

  return (pcm:Float32Array)=>{
    for(let i=0;i<pcm.length;i++){
      const dry=pcm[i];
      // Only the reverb send is filtered, leaving the instrument's low notes
      // intact while preventing low-frequency buildup in the room tail.
      highpass=dry-previousInput+highpassFeedback*highpass;
      previousInput=dry;
      const input=predelay[predelayIndex];
      predelay[predelayIndex]=highpass;
      if(++predelayIndex===predelay.length)predelayIndex=0;

      let wet=0;
      for(const comb of combs){
        const delayed=comb.buffer[comb.index];
        comb.lowpass=delayed*(1-damping)+comb.lowpass*damping;
        comb.buffer[comb.index]=input+comb.lowpass*comb.feedback;
        if(++comb.index===comb.buffer.length)comb.index=0;
        wet+=delayed;
      }
      wet/=combs.length;
      for(const diffuser of diffusers){
        const delayed=diffuser.buffer[diffuser.index];
        const output=delayed-.5*wet;
        diffuser.buffer[diffuser.index]=wet+.5*output;
        if(++diffuser.index===diffuser.buffer.length)diffuser.index=0;
        wet=output;
      }
      pcm[i]=dry+wet*amount;
    }
  };
}
