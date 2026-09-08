const express=require('express');
const store=require('../lib/store');
const design=require('../lib/design');
module.exports=({flash,persist})=>{
  const router=express.Router();
  const currentVersion=(req,res)=>{
    if(req.body.version && req.body.version!==store.getContent().updatedAt){
      flash(req,'Innhaldet vart endra i ei anna fane. Last sida på nytt før du lagrar.','feil');
      res.redirect(req.originalUrl.split('?')[0]);return false;
    } return true;
  };
  router.get('/utforming',(req,res)=>res.render('admin/utforming',{groups:design.groups,error:null}));
  router.post('/utforming',async(req,res)=>{
    if(!currentVersion(req,res))return;
    try{
      const c=structuredClone(store.getContent());
      c.design=design.parse(req.body,c);
      const order=c.design.sectionOrder.split(',').map(x=>x.trim());
      if(order.length!==5 || new Set(order).size!==5 || order.some(x=>!['tenester','handverk','utstilling','anter','avdelingar'].includes(x)))throw new Error('Rekkjefølgja må innehalde kvar av dei fem seksjonane éin gong. Bruk brytarane for å skjule seksjonar.');
      await persist(req,store.saveContent(c,'framside og profil'),'Framsida og profilen er lagra.');
      res.redirect('/admin/utforming');
    }catch(err){res.status(422).render('admin/utforming',{groups:design.groups,error:err.message,design:{...design.read(store.getContent()),...req.body}});}
  });
  router.get('/partnarar',(req,res)=>res.render('admin/partnarar',{error:null}));
  router.post('/partnarar',async(req,res)=>{
    if(!currentVersion(req,res))return;
    try{
      const c=structuredClone(store.getContent());
      const items=[];
      for(let i=0;i<12;i++){
        const name=String(req.body['name'+i]||'').trim().slice(0,100);if(!name)continue;
        const url=design.safeUrl(req.body['url'+i]);
        if(!url)throw new Error('Legg inn ei gyldig https-adresse for '+name+'.');
        const image=String(req.body['image'+i]||'');
        if(image&&!c.media.some(m=>m.id===image))throw new Error('Ukjend logo for '+name+'.');
        const original=(c.partners||[])[i];
        const surface=['light','dark'].includes(req.body['surface'+i])?req.body['surface'+i]:(original?.surface||(!image&&original?.logo?'dark':'light'));
        items.push({name,url,image,surface,text:String(req.body['text'+i]||'').trim().slice(0,1000),logo:original?.logo||'',extension:original?.extension||'png',hidden:req.body['hidden'+i]==='on'});
      }
      c.partners=items;
      await persist(req,store.saveContent(c,'samarbeidspartnarar'),'Samarbeidspartnarane er lagra.');
      res.redirect('/admin/partnarar');
    }catch(err){flash(req,err.message,'feil');res.redirect('/admin/partnarar');}
  });
  return router;
};
