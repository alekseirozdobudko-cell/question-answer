import {createAudioPlayer,setAudioModeAsync} from 'expo-audio';
import {File,Paths} from 'expo-file-system';
import {renderDrone,wav} from './render';
import type {Settings} from './music';
export async function initialize(){await setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false});}
export function audioFile(pcm:Float32Array){
  const file=new File(Paths.cache,`qa-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
  try{file.create();file.write(wav(pcm));return file;}catch(error){try{file.delete();}catch{}throw error;}
}
export function startDrone(settings:Settings){
  const file=audioFile(renderDrone(settings));
  let player:ReturnType<typeof createAudioPlayer>|undefined;
  try{player=createAudioPlayer({uri:file.uri});player.loop=true;player.play();}
  catch(error){player?.release();try{file.delete();}catch{}throw error;}
  let stopped=false;
  return ()=>{
    if(stopped)return;stopped=true;
    try{player?.pause();}catch{}
    try{player?.release();}catch{}
    try{file.delete();}catch{}
  };
}
