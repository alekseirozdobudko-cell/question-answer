import {File,Paths} from 'expo-file-system';
export function readSettings(): unknown {try{const file=new File(Paths.document,'qa-settings-v1.json');return file.exists?JSON.parse(file.textSync()):null;}catch{return null;}}
export function writeSettings(value: unknown){try{const file=new File(Paths.document,'qa-settings-v1.json');if(!file.exists)file.create();file.write(JSON.stringify(value));}catch{}}
