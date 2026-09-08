const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
process.env.NODE_ENV='test';
process.env.SESSION_SECRET=crypto.randomBytes(32).toString('hex');
const password=crypto.randomBytes(24).toString('hex');
process.env.ADMIN_PASSWORD_HASH=require('bcryptjs').hashSync(password,10);
delete process.env.GITHUB_TOKEN;delete process.env.GITHUB_REPO;delete process.env.SITE_URL;
const original=structuredClone(require('../data/content.json'));
let content=structuredClone(original),messages=[],mailSucceeds=true;
const store=require('../src/lib/store');
const {validateContent}=require('../src/lib/validateContent');
store.getContent=()=>content;
store.getMessages=()=>messages;
store.syncStatus=()=>({enabled:true,pulledOk:true,lastError:null});
store.saveContent=async(next)=>{validateContent(next);content=structuredClone(next);content.updatedAt=new Date().toISOString();return true;};
store.addMessage=msg=>{const rec={...msg,id:crypto.randomUUID()};messages.push(rec);return rec;};
store.deleteMessage=async id=>{messages=messages.filter(m=>m.id!==id);};
store.touchMessages=async()=>true;
store.saveInboxImage=()=>{};
const mail=require('../src/lib/mail');mail.configured=true;mail.notifyNewMessage=async()=>mailSucceeds;
const app=require('../src/app').createApp();
let server,base,cookie,csrf;
test.before(async()=>{server=app.listen(0);await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
test.after(()=>new Promise(r=>server.close(r)));
const request=(url,options={})=>fetch(base+url,{redirect:'manual',...options});
const post=(url,body,options={})=>request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...options.headers},body:new URLSearchParams(body)});
const pages=['/','/tenester','/om-oss','/butikk-og-landbruk','/prosjekt','/kontakt','/opplaeringsbedrift','/miljo-og-berekraft','/personvern','/informasjonskapslar'];
test('All public pages render accessible landmarks, local assets and safe branding',async()=>{
  const assets=new Set();
  for(const url of pages){
    const res=await request(url);assert.equal(res.status,200,url);const html=await res.text();
    assert.match(html,/<html lang="nn">/);assert.equal((html.match(/<h1\b/g)||[]).length,1,url+' h1');
    assert.match(html,/<main id="hovudinnhald">/);assert.match(html,/Personvern/);
    assert.doesNotMatch(html,/comfort|href="\/eigedom/i,url+' old brand');
    assert.match(res.headers.get('content-security-policy'),/object-src 'none'/);
    assert.match(res.headers.get('x-content-type-options'),/nosniff/);
    assert.equal(res.headers.get('x-powered-by'),null);
    assert.equal(res.headers.get('set-cookie'),null,'no public cookie');
    assert.doesNotMatch(html,/<iframe\b/,'no maps before consent');
    for(const m of html.matchAll(/(?:src|href)="(\/(?:media|css|js|fonts|img)\/[^"<>]+|\/theme\.css[^"<>]*|\/favicon\.svg)"/g))assets.add(m[1].replaceAll('&amp;','&'));
  }
  for(const asset of assets){const res=await request(asset);assert.equal(res.status,200,asset);}
});
test('Retired property pages return 410 and remain outside sitemap',async()=>{
  for(const path of ['/eigedom','/eigedom/gamal','/kr-a-vik-eigedom-as'])assert.equal((await request(path)).status,410,path);
  const xml=await(await request('/sitemap.xml')).text();assert.doesNotMatch(xml,/eigedom|renovering-bad/);
  assert.equal((await request('/prosjekt/renovering-bad')).status,404);
  assert.equal((await request('/finnst-ikkje')).status,404);
});
test('Invalid and cross-origin form submissions are rejected',async()=>{
  assert.equal((await post('/kontakt',{navn:'Test'})).status,422);
  assert.equal((await post('/kontakt',{navn:'Test',epost:'test@example.invalid',melding:'x'.repeat(5001)})).status,422);
  assert.equal((await post('/kontakt',{navn:'Test',telefon:'abcxyz',melding:'Test'})).status,422);
  assert.equal((await post('/kontakt',{}, {headers:{Origin:'https://attacker.invalid'}})).status,403);
  assert.equal(messages.length,0);
});
test('Contact and apprenticeship confirm only provider-accepted delivery',async()=>{
  for(const url of ['/kontakt','/opplaeringsbedrift']){
    messages=[];mailSucceeds=false;
    const fail=await post(url,{navn:'Test',epost:'test@example.invalid',melding:'Delivery test'});
    assert.equal(fail.status,503);assert.match(await fail.text(),/ikkje stadfeste/);assert.equal(messages.length,0);
    mailSucceeds=true;
    const success=await post(url,{navn:'Test',epost:'test@example.invalid',melding:'Delivery test'});
    assert.equal(success.status,302);assert.match(success.headers.get('location'),/sendt=1/);assert.equal(messages.length,1);assert.equal(messages[0].mailSent,true);
  }
});
test('Corrupt attachments cannot silently pass as delivered',async()=>{
  const body=new FormData();body.set('navn','Test');body.set('epost','test@example.invalid');body.set('melding','Attachment test');body.append('bilete',new Blob(['not a jpeg'],{type:'image/jpeg'}),'broken.jpg');
  const res=await request('/kontakt',{method:'POST',body});assert.equal(res.status,503);assert.match(await res.text(),/kunne ikkje lesast/);
});
test('Admin requires authentication and CSRF; all active editors render',async()=>{
  assert.equal((await request('/admin/utforming')).status,302);
  const login=await post('/admin/logg-inn',{brukar:process.env.ADMIN_USER||'admin',passord:password});assert.equal(login.status,302);
  cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  for(const url of ['/admin/oversikt','/admin/utforming','/admin/partnarar','/admin/sider','/admin/sider/home','/admin/sider/butikk','/admin/prosjekt','/admin/tenester','/admin/team','/admin/bilete','/admin/referansar','/admin/generelt','/admin/innstillingar','/admin/handbok','/admin/meldingar']){
    const res=await request(url,{headers:{Cookie:cookie}});assert.equal(res.status,200,url);assert.equal(res.headers.get('cache-control'),'no-store');const html=await res.text();
    if(url==='/admin/utforming')csrf=html.match(/name="_csrf" value="([^"]+)"/)[1];
  }
  assert.equal((await post('/admin/utforming',{}, {headers:{Cookie:cookie}})).status,403);
  assert.equal((await post('/admin/logg-ut',{}, {headers:{Cookie:cookie}})).status,403);
});
test('CMS changes affect public output and unsafe values are rejected',async()=>{
  const d=require('../src/lib/design');const body=Object.fromEntries(Object.entries(d.read(content)).map(([k,v])=>[k,typeof v==='boolean'?(v?'on':''):v]));
  const res=await post('/admin/utforming',{...body,_csrf:csrf,version:content.updatedAt,servicesTitle:'Ei ny testoverskrift'},{headers:{Cookie:cookie}});
  assert.equal(res.status,302);assert.match(await(await request('/')).text(),/Ei ny testoverskrift/);
  const rejected=await post('/admin/utforming',{...body,_csrf:csrf,version:content.updatedAt,chainUrl:'javascript:alert(1)'},{headers:{Cookie:cookie}});assert.equal(rejected.status,422);
  assert.throws(()=>d.parse({...body,darkColor:'#ffffff',paperColor:'#ffffff'},content),/kontrast/);
  assert.throws(()=>d.parse({...body,darkColor:'#ffffff',paperColor:'#000000',accentColor:'#000000'},content),/kontrast/);
  assert.ok(d.read({design:{craftImage:'',serviceImage:''}}).craftImage);
});
test('Import validation rejects malformed lists, dangerous URLs and prototype keys',()=>{
  const broken=()=>structuredClone(original);
  let c=broken();c.partners=[null];assert.throws(()=>validateContent(c),/liste/);
  c=broken();c.partners[0].url='javascript:alert(1)';assert.throws(()=>validateContent(c),/lenkje/);
  c=broken();c.site.mapEmbed='https://attacker.invalid/maps';assert.throws(()=>validateContent(c),/Kartadressa/);
  c=broken();c.design=JSON.parse('{"__proto__":{"polluted":true}}');assert.throws(()=>validateContent(c),/feltnamn/);
  c=broken();c.site.departments=[{}];assert.throws(()=>validateContent(c),/avdeling/);
  c=broken();c.site.social=[{}];assert.throws(()=>validateContent(c),/sosial/);
  c=broken();assert.doesNotThrow(()=>validateContent(c));
});

test('Image uploads preserve edits made while the images were processing',async()=>{
  const images=require('../src/lib/images'),saved=images.processUpload;
  const previous=structuredClone(content);
  try{
    for(const url of ['/admin/bilete/last-opp','/admin/prosjekt/last-opp']){
      const id=url.includes('prosjekt')?'concurrent-project':'concurrent-library';
      images.processUpload=async()=>{
        const newer=structuredClone(content);
        newer.site.phone='57 87 14 99';
        await store.saveContent(newer);
        return {id,w:8,h:8,alt:''};
      };
      const body=new FormData();body.set('_csrf',csrf);body.set('index','0');
      body.append('bilete',new Blob(['mock bytes'],{type:'image/png'}),'test.png');
      const res=await request(url,{method:'POST',headers:{Cookie:cookie},body});
      assert.equal(res.status,302);
      assert.equal(content.site.phone,'57 87 14 99');
      assert.ok(content.media.some(m=>m.id===id));
      if(url.includes('prosjekt'))assert.ok(content.projects[0].images.includes(id));
    }
  }finally{images.processUpload=saved;content=previous;}
});
