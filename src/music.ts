export type Formula = { name: string; intervals: number[]; degrees: string[] };
const f = (name: string, intervals: number[], degrees: string): Formula => ({ name, intervals, degrees: degrees.split(' ') });
export const CHORDS = [
  f('maj · Мажор', [0,4,7], '1 3 5'), f('m · Минор', [0,3,7], '1 ♭3 5'),
  f('dim · Уменьшённый', [0,3,6], '1 ♭3 ♭5'), f('aug · Увеличенный', [0,4,8], '1 3 ♯5'),
  f('sus2', [0,2,7], '1 2 5'), f('sus4', [0,5,7], '1 4 5'), f('5 · Квинта', [0,7], '1 5'),
  f('maj7', [0,4,7,11], '1 3 5 7'), f('m7', [0,3,7,10], '1 ♭3 5 ♭7'), f('7 · Доминантсептаккорд', [0,4,7,10], '1 3 5 ♭7'),
  f('m7♭5', [0,3,6,10], '1 ♭3 ♭5 ♭7'), f('dim7', [0,3,6,9], '1 ♭3 ♭5 ♭♭7'), f('m(maj7)', [0,3,7,11], '1 ♭3 5 7'),
  f('6', [0,4,7,9], '1 3 5 6'), f('m6', [0,3,7,9], '1 ♭3 5 6'),
  f('add9', [0,2,4,7], '1 9 3 5'), f('9', [0,2,4,7,10], '1 9 3 5 ♭7'),
  f('maj9', [0,2,4,7,11], '1 9 3 5 7'), f('m9', [0,2,3,7,10], '1 9 ♭3 5 ♭7'),
  f('7sus4', [0,5,7,10], '1 4 5 ♭7'), f('7♭9', [0,1,4,7,10], '1 ♭9 3 5 ♭7'), f('7♯9', [0,3,4,7,10], '1 ♯9 3 5 ♭7'),
  f('11', [0,2,4,5,7,10], '1 9 3 11 5 ♭7'), f('13', [0,2,4,5,7,9,10], '1 9 3 11 5 13 ♭7'),
];
export const SCALES = [
  f('Мажор · Ионийский', [0,2,4,5,7,9,11], '1 2 3 4 5 6 7'),
  f('Минор · Эолийский', [0,2,3,5,7,8,10], '1 2 ♭3 4 5 ♭6 ♭7'),
  f('Дорийский', [0,2,3,5,7,9,10], '1 2 ♭3 4 5 6 ♭7'),
  f('Фригийский', [0,1,3,5,7,8,10], '1 ♭2 ♭3 4 5 ♭6 ♭7'),
  f('Лидийский', [0,2,4,6,7,9,11], '1 2 3 ♯4 5 6 7'),
  f('Миксолидийский', [0,2,4,5,7,9,10], '1 2 3 4 5 6 ♭7'),
  f('Локрийский', [0,1,3,5,6,8,10], '1 ♭2 ♭3 4 ♭5 ♭6 ♭7'),
  f('Мажорная пентатоника', [0,2,4,7,9], '1 2 3 5 6'),
  f('Минорная пентатоника', [0,3,5,7,10], '1 ♭3 4 5 ♭7'),
  f('Блюзовый минор', [0,3,5,6,7,10], '1 ♭3 4 ♭5 5 ♭7'),
  f('Блюзовый мажор', [0,2,3,4,7,9], '1 2 ♭3 3 5 6'),
  f('Гармонический минор', [0,2,3,5,7,8,11], '1 2 ♭3 4 5 ♭6 7'),
  f('Мелодический минор ↑', [0,2,3,5,7,9,11], '1 2 ♭3 4 5 6 7'),
  f('Гармонический мажор', [0,2,4,5,7,8,11], '1 2 3 4 5 ♭6 7'),
  f('Фригийский доминантовый', [0,1,4,5,7,8,10], '1 ♭2 3 4 5 ♭6 ♭7'),
  f('Лидийский доминантовый', [0,2,4,6,7,9,10], '1 2 3 ♯4 5 6 ♭7'),
  f('Альтерированный', [0,1,3,4,6,8,10], '1 ♭9 ♯9 3 ♭5 ♯5 ♭7'),
  f('Целотоновый', [0,2,4,6,8,10], '1 2 3 ♯4 ♯5 ♭7'),
  f('Уменьшённый · тон–полутон', [0,2,3,5,6,8,9,11], '1 2 ♭3 4 ♭5 ♭6 6 7'),
  f('Уменьшённый · полутон–тон', [0,1,3,4,6,7,9,10], '1 ♭9 ♯9 3 ♯4 5 6 ♭7'),
  f('Бибоп доминантовый', [0,2,4,5,7,9,10,11], '1 2 3 4 5 6 ♭7 7'),
  f('Хроматический', [0,1,2,3,4,5,6,7,8,9,10,11], '1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7'),
];
export const ROOTS = ['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
export const LEVELS = ['Первые шаги','Плавный переход','Простой','Средний','Сложный','Эксперт'];
export type Settings = { instrument: 'bass'|'acousticGuitar'|'synth1'|'synth2'|'piano'; mode: 'chord'|'scale'|'tetrachord'|'custom'; root: number; chord: number; scale: number; tetrachord: number; customRoots: number[]; custom: number[]; octave: number; octaves: number; bars: number; answerBars: number; infiniteMelody: boolean; bpm: number; level: number; density: number; metro: boolean; metroDuringAnswer: boolean; drone: boolean; droneTone: number; volume: number };
export const DEFAULTS: Settings = { instrument:'bass',mode:'chord',root:0,chord:0,scale:0,tetrachord:0,customRoots:[0],custom:[0,4,7],octave:2,octaves:1,bars:1,answerBars:2,infiniteMelody:false,bpm:80,level:0,density:3,metro:true,metroDuringAnswer:true,drone:false,droneTone:1,volume:0.75 };
export type Note = { midi: number; name: string; octave: number; degree: string };
export type Event = { beat: number; duration: number; note: Note | null };
export type Phrase = { events: Event[]; beats: number };
export function tetrachordFormula(scaleIndex: number, start: number): Formula {
  const scale = SCALES[scaleIndex] ?? SCALES[0];
  const length = scale.intervals.length;
  const first = ((start % length) + length) % length;
  const intervals: number[] = [];
  const degrees: string[] = [];
  for (let offset = 0; offset < 4; offset++) {
    const degreeIndex = first + offset;
    const index = degreeIndex % length;
    intervals.push(scale.intervals[index] + Math.floor(degreeIndex / length) * 12);
    degrees.push(scale.degrees[index]);
  }
  return f(`${scale.name} ${String.fromCharCode(0x00b7)} ${degrees.join(String.fromCharCode(0x2013))}`, intervals, degrees.join(' '));
}
export function formula(s: Settings): Formula {
  return s.mode==='chord' ? CHORDS[s.chord] : s.mode==='scale' ? SCALES[s.scale] : s.mode==='tetrachord' ? tetrachordFormula(s.scale,s.tetrachord) : f('Свой набор', s.custom, s.custom.map(i=>['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'][i]).join(' '));
}
function spelling(root: number, degree: string, midi: number) {
  const letters = ['C','D','E','F','G','A','B'];
  const natural = [0,2,4,5,7,9,11];
  const index = (letters.indexOf(ROOTS[root][0]) + (parseInt(degree.replace(/[^0-9]/g,''))-1)%7)%7;
  let alter = ((midi%12-natural[index]+18)%12)-6;
  const name = letters[index] + (alter<0 ? '♭'.repeat(-alter) : '♯'.repeat(alter));
  return {name,octave:Math.floor((midi-alter)/12)-1};
}
export function pool(s: Settings): Note[] {
  const form = formula(s);
  const notes = new Map<number, Note>();
  const roots = s.mode === 'custom' ? (s.customRoots?.length ? [...new Set(s.customRoots)] : [s.root]) : [s.root];
  for (let o = 0; o < s.octaves; o++) for (const root of roots) form.intervals.forEach((interval, i) => {
    const midi = (s.octave + 1 + o) * 12 + root + interval;
    const context = roots.length > 1 ? ROOTS[root] + ':' + form.degrees[i] : form.degrees[i];
    const existing = notes.get(midi);
    if (existing) {
      const labels = existing.degree.split(' · ');
      if (!labels.includes(context)) existing.degree += ' · ' + context;
      return;
    }
    notes.set(midi, { midi, ...spelling(root, form.degrees[i], midi), degree: context });
  });
  return [...notes.values()].sort((a, b) => a.midi - b.midi);
}
export function rangeError(s: Settings): string | null {
  const notes=pool(s);
  if(!notes.length) return 'Выбери хотя бы одну ноту своего набора.';
  const [lowest,highest,label]=s.instrument==='synth2'||s.instrument==='synth1'||s.instrument==='piano'?[21,108,s.instrument==='synth2'?'Synthesizer 2 A0-C8':s.instrument==='synth1'?'Synthesizer 1 A0-C8':'Piano A0-C8']:s.instrument==='acousticGuitar'?[40,88,'Acoustic guitar E2-E6']:[28,67,'Bass E1-G4'];
  if(notes[0].midi<lowest || notes.at(-1)!.midi>highest) return `Выбери другой регистр или меньше октав: диапазон ${label} (24 лада).`;
  return null;
}
// Every pattern spans four quarter-note beats. A negative value is a rest.
const PATTERNS = [
  [[1,1,1,1],[2,1,1],[1,1,2],[2,2]],
  [[1,1,1,1],[2,1,1],[1,1,2],[.5,.5,1,2],[1,.5,.5,2]],
  [[1,1,.5,.5,1],[1,.5,.5,1,1],[.5,.5,1,2],[1,1,1,1]],
  [[1,-.5,.5,1,1],[.5,.5,-1,1,1],[1.5,.5,1,1],[.5,.5,1,.5,.5,1]],
  [[.5,1,.5,-.5,.5,1],[.5,1.5,.5,.5,1],[.75,.25,1,-.5,.5,1],[1,-.5,.5,.5,1,.5]],
  [[.25,.25,.5,1,-.5,.25,.25,1],[.75,.25,-.5,.5,.75,.25,1],[.5,.25,.25,1.5,.5,-.5,.5],[.25,.5,.25,-.5,.5,.5,1,.5]],
];
export function generate(s: Settings, random: ()=>number = Math.random): Phrase {
  if(rangeError(s)) throw new Error(rangeError(s)!);
  const notes=pool(s), events: Event[]=[]; let last=-1, beat=0;
  for(let bar=0;bar<s.bars;bar++) {
    let choices=PATTERNS[s.level];
    let rhythm=choices[Math.floor(random()*choices.length)];
    // Density is the maximum number of attacks per bar; merged slots become sustained notes.
    let slots = [...rhythm];
    while(slots.filter(x=>x>0).length>s.density) {
      const attacks=slots.map((v,i)=>v>0?i:-1).filter(i=>i>=0);
      const pair=Math.floor(random()*(attacks.length-1)),i=attacks[pair],j=attacks[pair+1];
      slots.splice(i,j-i+1,slots.slice(i,j+1).reduce((sum,n)=>sum+Math.abs(n),0));
    }
    for(const length of slots) {
      if(length<0) events.push({beat,duration:-length,note:null});
      else {
        const reach=[1,1,2,3,5,100][s.level];
        const candidates=notes.map((_,i)=>i).filter(i=>last<0||Math.abs(i-last)<=reach);
        const next=candidates.length?candidates[Math.floor(random()*candidates.length)]:last;
        events.push({beat,duration:length,note:notes[next]}); last=next;
      }
      beat+=Math.abs(length);
    }
  }
  return {events,beats:s.bars*4};
}
export function preset(s: Settings, level: number): Settings {
  return {...s,level,bars:[1,1,1,2,2,4][level],density:[3,3,5,6,7,8][level]};
}
