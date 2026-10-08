import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
export async function extractText(path, name){const b=await fs.readFile(path); const ext=name.toLowerCase().split('.').pop(); if(ext==='pdf'){const parser=new PDFParse({data:b}); try{return (await parser.getText()).text;} finally{await parser.destroy();}} if(ext==='docx'){return (await mammoth.extractRawText({buffer:b})).value;} if(ext==='txt'){return b.toString('utf8');} throw new Error('Supported formats: PDF, DOCX, TXT');}
export function chunks(text,size=1200,overlap=150){const words=text.replace(/\s+/g,' ').trim().split(' '); const out=[]; for(let i=0;i<words.length;i+=size-overlap){out.push(words.slice(i,i+size).join(' ')); if(i+size>=words.length)break;} return out;}
