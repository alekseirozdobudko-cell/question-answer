import config from '../app.json';

export const CURRENT_VERSION=config.expo.version;
export const RELEASES_URL='https://github.com/alekseirozdobudko-cell/question-answer/releases';
const LATEST_RELEASE_API='https://api.github.com/repos/alekseirozdobudko-cell/question-answer/releases/latest';

export type AppRelease={
  version:string;
  isNewer:boolean;
  releaseUrl:string;
  apkUrl:string|null;
  htmlUrl:string|null;
};

function record(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}

function versionParts(value:unknown):number[]|null{
  if(typeof value!=='string'||!/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))return null;
  const parts=value.replace(/^v/,'').split('.').map(Number);
  return parts.every(Number.isSafeInteger)?parts:null;
}

function newerVersion(candidate:number[],installed:number[]):boolean{
  for(let i=0;i<3;i++){
    if(candidate[i]!==installed[i])return candidate[i]>installed[i];
  }
  return false;
}

export async function latestRelease(signal:AbortSignal):Promise<AppRelease|null>{
  const response=await fetch(LATEST_RELEASE_API,{
    signal,
    cache:'no-store',
    headers:{Accept:'application/vnd.github+json'},
  }).catch(()=>{
    throw new Error('Не удалось связаться с GitHub. Проверь подключение к интернету или открой страницу релизов.');
  });
  if(response.status===404)return null;
  if(!response.ok)throw new Error('Не удалось получить список версий. Попробуй ещё раз или открой релизы на GitHub.');

  let data:unknown;
  try{data=await response.json();}
  catch{throw new Error('Не удалось прочитать сведения о версии. Попробуй ещё раз позже.');}
  if(!record(data))throw new Error('GitHub вернул неполные сведения о версии. Попробуй ещё раз позже.');
  if(data.draft===true||data.prerelease===true)return null;
  const parts=versionParts(data.tag_name),installed=versionParts(CURRENT_VERSION);
  if(!parts||!installed||typeof data.tag_name!=='string')throw new Error('Не удалось определить номер новой версии. Открой релизы на GitHub.');

  const tag=encodeURIComponent(data.tag_name);
  const assets=Array.isArray(data.assets)?data.assets:[];
  function assetUrl(name:string):string|null{
    const ready=assets.some(asset=>record(asset)&&asset.name===name&&asset.state==='uploaded'&&typeof asset.size==='number'&&asset.size>0);
    // Build links for this repository instead of following URLs from the response.
    return ready?`${RELEASES_URL}/download/${tag}/${name}`:null;
  }
  return {
    version:parts.join('.'),
    isNewer:newerVersion(parts,installed),
    releaseUrl:`${RELEASES_URL}/tag/${tag}`,
    apkUrl:assetUrl('Question-and-Answer.apk'),
    htmlUrl:assetUrl('Question-and-Answer.html'),
  };
}
