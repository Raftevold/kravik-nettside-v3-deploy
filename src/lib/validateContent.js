const {safeUrl,parse,defaults}=require('./design');
function validateContent(c){
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  if(!object(c)||!object(c.site)||!object(c.pages))throw new Error('Ugyldig innhaldsfil.');
  function walk(value,depth=0){
    if(depth>15)throw new Error('Innhaldet er for djupt nøsta.');
    if(typeof value==='string'&&value.length>30000)throw new Error('Eit tekstfelt er for langt.');
    if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){
      if(['__proto__','constructor','prototype'].includes(k))throw new Error('Ugyldig feltnamn.');
      if((k==='url'||k==='link')&&v&&!safeUrl(v))throw new Error('Ugyldig lenkje: bruk https:// eller /intern-adresse.');
      if(k==='id'&&typeof v==='string'&&!/^[a-z0-9-]+$/.test(v))throw new Error('Ugyldig ID.');
      walk(v,depth+1);
    }
  }walk(c);
  for(const k of ['name','phone','email','orgnr'])if(typeof c.site[k]!=='string'||!c.site[k])throw new Error('Kontaktinfo manglar: '+k);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.site.email))throw new Error('Ugyldig e-postadresse.');
  if(c.site.formRecipient&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.site.formRecipient))throw new Error('Ugyldig mottakaradresse for nettskjema.');
  if(!object(c.site.address))throw new Error('Adresse manglar.');
  for(const k of ['home','tenester','omOss','butikk','opplaering','miljo','prosjekt','kontakt'])if(!object(c.pages[k]))throw new Error('Side manglar: '+k);
  for(const k of ['services','team','testimonials','projects','media','gallery','partners']){
    if(!Array.isArray(c[k])||c[k].some(x=>!object(x)))throw new Error('Ugyldig liste: '+k);
  }
  for(const k of ['departments','openingHours','social'])if(!Array.isArray(c.site[k])||c.site[k].some(x=>!object(x)))throw new Error('Ugyldig kontaktliste: '+k);
  for(const d of c.site.departments)if(!d.name||typeof d.name!=='string'||typeof d.address!=='string'||typeof d.phone!=='string')throw new Error('Ugyldig avdeling.');
  for(const s of c.site.social)if(!s.type||typeof s.type!=='string'||!safeUrl(s.url))throw new Error('Ugyldig sosial lenkje.');
  for(const o of c.site.openingHours)if(typeof o.label!=='string'||typeof o.value!=='string')throw new Error('Ugyldig opningstid.');
  if(!object(c.alert)||typeof c.alert.text!=='string')throw new Error('Ugyldig varsellinje.');
  for(const g of c.gallery)if(typeof g.image!=='string'||!c.media.some(m=>m.id===g.image))throw new Error('Eit galleribilete manglar i biblioteket.');
  for(const s of c.services)if(!s.id||typeof s.title!=='string'||typeof s.text!=='string')throw new Error('Ugyldig teneste.');
  for(const t of c.team)if(typeof t.name!=='string'||typeof t.role!=='string')throw new Error('Ugyldig kontaktperson.');
  for(const t of c.testimonials)if(typeof t.quote!=='string'||typeof t.author!=='string'||(t.rating&&(!Number.isInteger(t.rating)||t.rating<1||t.rating>5)))throw new Error('Ugyldig referanse.');
  for(const p of c.partners)if(typeof p.name!=='string'||!safeUrl(p.url))throw new Error('Ugyldig samarbeidspartnar.');
  for(const m of c.media)if(!/^[a-z0-9-]+$/.test(m.id))throw new Error('Ugyldig bilete.');
  for(const p of c.projects)if(!p.id||typeof p.title!=='string'||!Array.isArray(p.images))throw new Error('Ugyldig prosjekt.');
  if(c.site.mapEmbed){try{const u=new URL(c.site.mapEmbed);if(u.protocol!=='https:'||!['www.google.com','maps.google.com'].includes(u.hostname)||!u.pathname.startsWith('/maps'))throw 0;}catch{throw new Error('Kartadressa må vere ei Google Maps-innbygging via https.');}}
  if(c.design){
    const d={...defaults,...c.design};
    const body=Object.fromEntries(Object.entries(d).map(([k,v])=>[k,typeof v==='boolean'?(v?'on':''):v]));
    c.design=parse(body,c);
  }
  // Gamle sikkerheitskopiar skal ikkje aktivere eigedomsverksemda igjen.
  delete c.pages.eigedom;c.properties=[];
  return c;
}
module.exports={validateContent};
