const assert=require('node:assert/strict');
const {CURRENT_VERSION,RELEASES_URL,latestRelease}=require('../src/updates.ts');

async function test(){
  const originalFetch=global.fetch;
  const controller=new AbortController();
  const [major,minor,patch]=CURRENT_VERSION.split('.').map(Number);
  const nextVersion=`${major}.${minor}.${patch+1}`;
  const assets=['Question-and-Answer.apk','Question-and-Answer.html'].map(name=>({name,state:'uploaded',size:1234}));
  let payload,status=200;
  global.fetch=async(url,options)=>{
    assert.equal(url,'https://api.github.com/repos/alekseirozdobudko-cell/question-answer/releases/latest');
    assert.equal(options.signal,controller.signal,'the request can be cancelled when the update dialog closes');
    assert.equal(options.cache,'no-store');
    return {status,ok:status===200,json:async()=>payload};
  };
  const release=(version,changes={})=>({tag_name:`v${version}`,draft:false,prerelease:false,assets,...changes});
  try{
    for(const [version,isNewer] of [
      [CURRENT_VERSION,false],
      ['0.0.0',false],
      [nextVersion,true],
      [`${major}.${minor}.${patch+10}`,true],
      [`${major}.${minor+1}.0`,true],
      [`${major+1}.0.0`,true],
    ]){
      payload=release(version);
      const result=await latestRelease(controller.signal);
      assert.equal(result.version,version);
      assert.equal(result.isNewer,isNewer,'versions are compared numerically, without offering a downgrade');
      assert.equal(result.apkUrl,`${RELEASES_URL}/download/v${version}/Question-and-Answer.apk`);
      assert.equal(result.htmlUrl,`${RELEASES_URL}/download/v${version}/Question-and-Answer.html`);
      assert.equal(result.releaseUrl,`${RELEASES_URL}/tag/v${version}`);
    }
    payload=release(nextVersion,{tag_name:nextVersion});
    assert.equal((await latestRelease(controller.signal)).version,nextVersion,'a stable version tag may omit v');
    for(const changes of [{draft:true},{prerelease:true}]){
      payload=release(nextVersion,changes);
      assert.equal(await latestRelease(controller.signal),null,'unpublished and preview releases are excluded');
    }
    for(const invalid of [null,[],{},release(nextVersion,{tag_name:'v01.0.0'}),release(nextVersion,{tag_name:'v1.0.3-beta.1'}),release(nextVersion,{tag_name:'../../bad'}),release(nextVersion,{tag_name:'v9007199254740992.0.0'})]){
      payload=invalid;
      await assert.rejects(latestRelease(controller.signal),/сведения|сведений|номер/,'malformed release metadata is rejected');
    }
    for(const incompleteAssets of [undefined,[],[{name:'other.apk',state:'uploaded',size:1234}],[{name:'Question-and-Answer.apk',state:'new',size:1234}],[{name:'Question-and-Answer.apk',state:'uploaded',size:0}]]){
      payload=release(nextVersion,{assets:incompleteAssets});
      const result=await latestRelease(controller.signal);
      assert.equal(result.apkUrl,null,'a missing or unfinished APK is never offered for download');
      assert.ok(result.releaseUrl.startsWith(RELEASES_URL+'/tag/'),'the release page remains available as a fallback');
    }
    payload=release(nextVersion,{html_url:'https://example.com/bad',assets:assets.map(asset=>({...asset,browser_download_url:'https://example.com/bad'}))});
    assert.equal((await latestRelease(controller.signal)).apkUrl,`${RELEASES_URL}/download/v${nextVersion}/Question-and-Answer.apk`,'download links always point to this GitHub repository');
    status=404;assert.equal(await latestRelease(controller.signal),null);
    for(const code of [403,429,500]){
      status=code;
      await assert.rejects(latestRelease(controller.signal),/GitHub/,'API failures provide a message and a release-page fallback');
    }
    status=200;global.fetch=async()=>{throw new Error('Network request failed');};
    await assert.rejects(latestRelease(controller.signal),/подключение к интернету/,'network failures produce a readable message');
    global.fetch=async()=>({status:200,ok:true,json:async()=>{throw new SyntaxError('Invalid JSON');}});
    await assert.rejects(latestRelease(controller.signal),/прочитать сведения/,'invalid JSON never exposes a parser error to the user');
    console.log('Updates validated: numeric versions, stable releases, completed downloads, trusted GitHub links, cancellation, offline mode and API errors.');
  }finally{
    global.fetch=originalFetch;
  }
}

test().catch(error=>{console.error(error);process.exitCode=1;});
