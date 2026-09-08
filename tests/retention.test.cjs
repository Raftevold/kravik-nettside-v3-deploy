const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kravik-retention-'));
process.env.DATA_DIR=dir;delete process.env.GITHUB_TOKEN;delete process.env.GITHUB_REPO;
const content=structuredClone(require('../data/content.json'));content.design.messageRetentionDays='30';
fs.mkdirSync(path.join(dir,'innboks'));
fs.writeFileSync(path.join(dir,'content.json'),JSON.stringify(content));
fs.writeFileSync(path.join(dir,'messages.json'),JSON.stringify([
  {id:'old',sentAt:new Date(Date.now()-31*86400000).toISOString(),images:['aaaaaaaaaaaaaaaa.jpg']},
  {id:'current',sentAt:new Date().toISOString(),images:['bbbbbbbbbbbbbbbb.jpg']},
]));
fs.writeFileSync(path.join(dir,'innboks','aaaaaaaaaaaaaaaa.jpg'),'expired');fs.writeFileSync(path.join(dir,'innboks','bbbbbbbbbbbbbbbb.jpg'),'current');
const store=require('../src/lib/store');
test('Retention deletes expired messages and their private attachments, keeping current records',async()=>{
  await store.init();assert.deepEqual(store.getMessages().map(x=>x.id),['current']);
  assert.equal(fs.existsSync(path.join(dir,'innboks','aaaaaaaaaaaaaaaa.jpg')),false);
  assert.equal(fs.existsSync(path.join(dir,'innboks','bbbbbbbbbbbbbbbb.jpg')),true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'messages.json'))).map(x=>x.id),['current']);
});
test.after(()=>{const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('kravik-retention-'));fs.rmSync(resolved,{recursive:true,force:true});});
