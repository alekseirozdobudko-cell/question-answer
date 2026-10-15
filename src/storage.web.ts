export function readSettings(): unknown {try{return JSON.parse(localStorage.getItem('qa-settings-v1')||'null');}catch{return null;}}
export function writeSettings(value: unknown){try{localStorage.setItem('qa-settings-v1',JSON.stringify(value));}catch{}}
