// Server-side only: API key never appears in the website's JavaScript.
const API='https://api.kickoffapi.com/api/v2';
const json=(status,data)=>({statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=600, s-maxage=3600'},body:JSON.stringify(data)});
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slovenia=s=>/slovenia|slovenija/.test(normalize(s));
const done=new Set(['FT','AET','PEN']);
exports.handler=async()=>{
  const key=process.env.KICKOFF_API_KEY;
  if(!key)return json(503,{ok:false,message:'KICKOFF_API_KEY ni nastavljen v Netlify Functions'});
  try{
    const today=new Date(), from=new Date(today);from.setUTCDate(from.getUTCDate()-100);
    const to=new Date(today);to.setUTCDate(to.getUTCDate()+65);
    // UEFA Nations League (legacy competition id 5). Only return matches involving Slovenia.
    const url=new URL(API+'/fixtures');
    url.searchParams.set('league','5');url.searchParams.set('season','2026');
    url.searchParams.set('from',from.toISOString().slice(0,10));url.searchParams.set('to',to.toISOString().slice(0,10));
    url.searchParams.set('limit','200');
    const res=await fetch(url,{headers:{'x-api-key':key,'Accept':'application/json'},signal:AbortSignal.timeout(12000)});
    if(!res.ok){return json(502,{ok:false,message:res.status===401?'KickoffAPI ključ ni veljaven':res.status===429?'Dosežena je omejitev brezplačnega paketa':'KickoffAPI je vrnil napako '+res.status});}
    const body=await res.json();
    if(!Array.isArray(body.data))return json(502,{ok:false,message:'Nepričakovan odgovor KickoffAPI'});
    const matches=body.data.filter(m=>(slovenia(m.home?.name)||slovenia(m.away?.name))&&done.has(m.status?.short)&&Number.isInteger(m.score?.home)&&Number.isInteger(m.score?.away)).map(m=>({id:m.id,date:m.date,league:m.league?.name||'Liga narodov',home:m.home.name,away:m.away.name,homeScore:m.score.home,awayScore:m.score.away})).sort((a,b)=>b.date.localeCompare(a.date));
    return json(200,{ok:true,matches,updated:new Date().toISOString(),note:'Prikazane so samo zaključene tekme Slovenije, ki jih vir vrne za Ligo narodov 2026.'});
  }catch(e){return json(502,{ok:false,message:'Povezava do KickoffAPI trenutno ni uspela'});}
};
