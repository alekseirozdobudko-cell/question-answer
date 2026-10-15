import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const assets=new URL('assets/',root);
const bank={};
for(const name of fs.readdirSync(assets).filter(n=>n.endsWith('.wav'))) {
  const b=fs.readFileSync(new URL(name,assets)); let offset=12, data, channels, rate, bits, format;
  while(offset+8<=b.length) {
    const id=b.toString('ascii',offset,offset+4), size=b.readUInt32LE(offset+4);
    if(id==='fmt ') { format=b.readUInt16LE(offset+8); channels=b.readUInt16LE(offset+10);rate=b.readUInt32LE(offset+12);bits=b.readUInt16LE(offset+22); }
    if(id==='data') data=b.subarray(offset+8,offset+8+size);
    offset+=8+size+(size%2);
  }
  if(format!==1||bits!==16||!data) throw new Error('Unsupported WAV '+name);
  const count=Math.min(Math.floor(data.length/(2*channels)*22050/rate),22050*6), pcm=Buffer.alloc(count*2);
  for(let i=0;i<count;i++) {const src=Math.floor(i*rate/22050); let v=0; for(let c=0;c<channels;c++) v+=data.readInt16LE((src*channels+c)*2)/channels; pcm.writeInt16LE(Math.round(v),i*2);}
  const [,letter,sharp,octave]=name.match(/^([A-G])(s?)(\d)\.wav$/);
  const midi=12*(Number(octave)+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter])+(sharp?1:0);
  bank[midi]=pcm.toString('base64');
}
fs.writeFileSync(new URL('src/samples.json',root),JSON.stringify(bank));
console.log('Prepared',Object.keys(bank).length,'bass recordings at 22050 Hz.');
