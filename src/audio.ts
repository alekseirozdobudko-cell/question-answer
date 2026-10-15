// iOS retains the existing per-player backend: its playlist implementation
// rebuilds active playback when consumed tracks are removed. Android uses
// audio.android.ts; the browser uses audio.web.ts for clock-based scheduling.
import {createAudioPlayer} from 'expo-audio';
import {audioFile} from './audio-native';
import {createSequenceRenderer,type SequenceCallbacks} from './sequence';
import type {Settings} from './music';
export {initialize,startDrone} from './audio-native';

export function playSequence(settings:Settings,callbacks:SequenceCallbacks){
  const renderNext=createSequenceRenderer(settings,callbacks.next);
  let stopped=false,subscription:{remove:()=>void}|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const prepare=()=>{
    const {phrase,pcm}=renderNext(),file=audioFile(pcm);
    try{return {phrase,file,player:createAudioPlayer({uri:file.uri},{updateInterval:50})};}
    catch(error){try{file.delete();}catch{}throw error;}
  };
  let current:ReturnType<typeof prepare>|undefined,next:ReturnType<typeof prepare>|undefined;
  const dispose=(entry:typeof current)=>{try{entry?.player.release();}catch{}try{entry?.file.delete();}catch{}};
  const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);subscription?.remove();dispose(current);dispose(next);current=next=undefined;};
  const play=()=>{
    callbacks.phrase(current!.phrase);
    subscription=current!.player.addListener('playbackStatusUpdate',status=>{
      if(stopped)return;
      try{
        callbacks.progress(status.currentTime);
        if(status.didJustFinish){subscription?.remove();dispose(current);current=next??prepare();next=undefined;play();}
      }catch(error){stop();callbacks.error(error);}
    });
    current!.player.play();
    timer=setTimeout(()=>{timer=undefined;if(stopped)return;try{next=prepare();}catch(error){stop();callbacks.error(error);}},100);
  };
  try{current=prepare();play();return stop;}catch(error){stop();throw error;}
}
