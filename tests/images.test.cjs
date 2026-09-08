const test=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const store=require('../src/lib/store');
const images=require('../src/lib/images');
store.uploadExists=()=>false;

test('Public image processing propagates durable-storage failure before returning metadata',async()=>{
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#052634'}}).png().toBuffer();
  let writes=0;
  store.saveUpload=async()=>{writes++;throw new Error('simulated sync failure');};
  await assert.rejects(images.processUpload(bytes,'test.png',[]),/simulated sync failure/);
  assert.equal(writes,1);
  const stored=[];
  store.saveUpload=async(name)=>{await new Promise(r=>setImmediate(r));stored.push(name);};
  const entry=await images.processUpload(bytes,'test.png',[]);
  assert.equal(entry.id,'test');
  assert.deepEqual(stored,['test-lg.webp','test-md.webp','test-sm.webp']);
});

test('Media deletion waits for durable deletion and propagates errors',async()=>{
  store.deleteUpload=async()=>{throw new Error('simulated delete failure');};
  await assert.rejects(images.deleteMedia('test'),/simulated delete failure/);
});
