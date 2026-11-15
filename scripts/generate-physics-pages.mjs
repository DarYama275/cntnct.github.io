import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Run from any directory: node scripts/generate-physics-pages.mjs
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='https://containnect.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const concise=(v,n=240)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const list=(items,fn)=>items.length?'<ul>'+items.map(fn).join('')+'</ul>':'<p>掲載情報はありません。</p>';
const unique=arr=>[...new Set(arr.filter(Boolean))];
const stylesheet='<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0a0a0f;color:#e8e8f0;font-family:system-ui,sans-serif;line-height:1.75}main,header,footer{max-width:880px;margin:auto;padding:1.5rem}a{color:#4af0c4}h1{font-size:clamp(1.7rem,5vw,2.6rem)}h2{margin-top:2rem}.muted,small{color:#b3b3c4}.cta{display:inline-block;padding:.65rem 1rem;background:#4af0c4;color:#07110e;border-radius:7px;text-decoration:none;font-weight:bold}footer{border-top:1px solid #303042}</style>';
function page(section){
  if(!section?.title||!/^\d+(?:\.\d+)+$/.test(String(section.id)))throw Error('Invalid section title/id: '+section?.id);
  const filename=section.id.replaceAll('.','-')+'.html';
  const url=base+'/physics-topics/'+filename;
  const title=section.title+'（'+section.id+'）｜高校物理の動く図解・学習教材';
  const description=concise(section.title+'。'+(section.summary||'')+' 動く図解、直感クイズ、計算問題で学べます。',155);
  const kws=unique((section.keywords||[]).map(k=>k.ja||k.en));
  const diagrams=(section.diagrams||[]).filter(d=>d.available!==false);
  const topics=(section.subtopics||[]).filter(t=>t.title);
  const action='<a class="cta" href="/physics.html">アプリで教材を使う</a>';
  const body='<p class="muted">'+esc(section.chapterTitle||'高校物理')+' · SECTION '+esc(section.id)+'</p><h1>'+esc(section.title)+'</h1><p>'+esc(concise(section.summary,360)||'この単元の物理を学びます。')+'</p><p>'+action+'</p>'
  +'<h2>学習キーワード</h2>'+list(kws,k=>'<li>'+esc(k)+'</li>')
  +'<h2>学習する内容</h2>'+list(topics,t=>'<li><strong>'+esc(t.title)+'</strong>'+(t.summary?' — '+esc(concise(t.summary,180)):'')+'</li>')
  +'<h2>動く図解</h2>'+list(diagrams,d=>'<li>'+esc(d.title||d.id)+'</li>')
  +'<h2>アプリでできること</h2><ul><li>動く図解：'+diagrams.length+'件</li><li>直感クイズ：'+((section.keywords||[]).some(k=>k.quizId)?'あり':'登録なし')+'</li><li>計算問題：'+((section.calculations||[]).length?'あり':'登録なし')+'</li><li>共通テスト解説：'+((section.explanations||[]).length?'あり':'登録なし')+'</li></ul><p>図解の操作や演習はAndroid・iOS対応アプリで利用できます。</p><p>'+action+'</p>';
  const schema={'@context':'https://schema.org','@type':'LearningResource',name:title,url,description,inLanguage:'ja',educationalLevel:'高校',about:kws,provider:{'@type':'Organization',name:'Containnect',url:base}};
  const html='<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(url)+'"><meta property="og:type" content="article"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(url)+'">'+stylesheet+'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script></head><body><header><nav><a href="/">Containnect</a> / <a href="/physics-catalog.html">教材カタログ</a></nav></header><main>'+body+'</main><footer><a href="/physics-catalog.html">教材一覧へ戻る</a></footer></body></html>\n';
  return {filename,url,html};
}
const index=JSON.parse(await readFile(path.join(root,'data/learning-content-index.json'),'utf8'));
if(!Array.isArray(index.sections)||index.sections.length===0)throw Error('No catalog sections');
const pages=index.sections.map(page);
if(new Set(pages.map(p=>p.filename)).size!==pages.length)throw Error('Duplicate section ids');
const out=path.join(root,'physics-topics');await mkdir(out,{recursive:true});
for(const file of await readdir(out))if(/^\d+(?:-\d+)+\.html$/.test(file)&&!pages.some(p=>p.filename===file))await rm(path.join(out,file));
for(const p of pages)await writeFile(path.join(out,p.filename),p.html);
const sitemap=path.join(root,'sitemap.xml'),xml=await readFile(sitemap,'utf8');
if(!/<urlset\b/.test(xml))throw Error('Invalid sitemap format');
const original=[...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)].filter(m=>!m[1].startsWith(base+'/physics-topics/')).map(m=>m[0]);
const generated=pages.map(p=>'  <url><loc>'+p.url+'</loc><changefreq>monthly</changefreq></url>');
await writeFile(sitemap,'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...original,...generated].join('\n')+'\n</urlset>\n');
console.log('Generated '+pages.length+' topic pages and updated sitemap');
