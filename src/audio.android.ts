import {createAudioPlaylist,type AudioPlaylistStatus} from 'expo-audio';
import {type File} from 'expo-file-system';
import {audioFile} from './audio-native';
export {initialize,startDrone} from './audio-native';
import {createSequenceRenderer,type SequenceCallbacks} from './sequence';
import type {Settings} from './music';
export function playSequence(settings:Settings,callbacks:SequenceCallbacks){
  const renderNext=createSequenceRenderer(settings,callbacks.next);
  const entries:Array<{phrase:ReturnType<typeof renderNext>['phrase'];file:File}>=[];
  let playlist:ReturnType<typeof createAudioPlaylist>|undefined,subscription:{remove:()=>void}|undefined;
  let stopped=false,started=false,maintaining=false,timer:ReturnType<typeof setTimeout>|undefined,startupTimer:ReturnType<typeof setTimeout>|undefined;
  let current:typeof entries[number]|undefined;
  const stop=()=>{
    if(stopped)return;stopped=true;clearTimeout(timer);clearTimeout(startupTimer);subscription?.remove();
    try{playlist?.clear();}catch{}
    try{playlist?.destroy();}catch{}
    try{playlist?.release();}catch{}
    for(const entry of entries){try{entry.file.delete();}catch{}}entries.length=0;
  };
  const makeEntry=()=>{const {phrase,pcm}=renderNext();return {phrase,file:audioFile(pcm)};};
  const maintain=()=>{
    timer=undefined;if(stopped||!playlist)return;
    maintaining=true;
    try{
      const consumed=playlist.currentIndex;
      const missing=3-(entries.length-consumed);
      for(let i=0;i<missing;i++){
        const entry=makeEntry();entries.push(entry);playlist.add({uri:entry.file.uri});
      }
      // Refill before pruning. The snapshot remains safe if native playback
      // advances while JavaScript is rendering the next audio block.
      for(let i=0;i<consumed;i++){
        playlist.remove(0);const previous=entries.shift()!;try{previous.file.delete();}catch{}
      }
    }catch(error){stop();callbacks.error(error);}finally{maintaining=false;}
  };
  try{
    for(let i=0;i<3;i++)entries.push(makeEntry());
    // One native queue owns the transitions. JS never restarts a player at
    // the end of a phrase; the queued WAVs all use the same PCM format.
    playlist=createAudioPlaylist({sources:entries.map(entry=>({uri:entry.file.uri})),updateInterval:50});
    current=entries[0];
    const update=(status:AudioPlaylistStatus)=>{
      if(stopped||maintaining)return;
      try{
        const error=(status as typeof status&{error?:{message?:string}}).error;
        if(error)throw new Error(error.message??'Не удалось воспроизвести звук.');
        if(!started){
          if(!playlist!.isLoaded||playlist!.isBuffering)return;
          started=true;clearTimeout(startupTimer);callbacks.phrase(current!.phrase);playlist!.play();
        }
        // A queued status event can predate removal of a consumed track.
        // Read the live native cursor instead of interpreting its old index.
        const entry=entries[playlist!.currentIndex];if(!entry)return;
        if(entry!==current){current=entry;callbacks.phrase(entry.phrase);if(!timer)timer=setTimeout(maintain,0);}
        callbacks.progress(playlist!.currentTime);
        if(status.didJustFinish)throw new Error('Очередь звука закончилась. Запусти практику ещё раз.');
      }catch(error){stop();callbacks.error(error);}
    };
    subscription=playlist.addListener('playlistStatusUpdate',update);
    startupTimer=setTimeout(()=>{if(stopped||started)return;stop();callbacks.error(new Error('Плеер не подготовил звук. Запусти практику ещё раз.'));},10000);
    update(playlist.currentStatus);
    return stop;
  }catch(error){stop();throw error;}
}
