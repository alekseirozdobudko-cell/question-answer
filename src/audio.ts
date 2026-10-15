import {createAudioPlayer,setAudioModeAsync, type AudioPlayer} from 'expo-audio';
import {File,Paths} from 'expo-file-system';
import {render,renderDrone,wav} from './render';
import type {Settings,Phrase} from './music';
export type Prepared = {player: AudioPlayer; file: File};
export async function initialize(){await setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false});}
export function prepare(phrase: Phrase,settings: Settings): Prepared {
  const file=new File(Paths.cache,`qa-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
  file.create();file.write(wav(render(phrase,settings)));
  return {file,player:createAudioPlayer({uri:file.uri},{updateInterval:50})};
}
export function startDrone(settings: Settings) {
  const file=new File(Paths.cache,`qa-drone-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
  file.create();file.write(wav(renderDrone(settings)));
  const player=createAudioPlayer({uri:file.uri},{updateInterval:1000});
  player.loop=true;player.play();
  let stopped=false;
  return ()=>{if(stopped)return;stopped=true;player.pause();player.release();try{file.delete();}catch{}};
}
export function dispose(p: Prepared){p.player.release();try{p.file.delete();}catch{}}
export function play(p: Prepared,progress:(seconds:number)=>void,done:()=>void){
  let finished=false;
  const sub=p.player.addListener('playbackStatusUpdate',status=>{if(finished)return;progress(status.currentTime);if(status.didJustFinish){finished=true;sub.remove();done();}});
  p.player.play();return ()=>{finished=true;sub.remove();p.player.pause();};
}
