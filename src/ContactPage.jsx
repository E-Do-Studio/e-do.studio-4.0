/* global React, IconArrowRight, IconMenu, Wordmark, CellLabel, MarqueeCell, Button, useBreakpoint */

const { useState: useStateContact } = React;

const ContactIcon = ({ kind, size=14 }) => {
  const p = {width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.4};
  if (kind==='instagram') return (<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>);
  if (kind==='facebook') return (<svg viewBox="0 0 24 24" {...p}><path d="M14 7h3V4h-3c-2 0-3 1.5-3 3.5V10H8v3h3v8h3v-8h2.5l.5-3H14V8c0-.5.3-1 1-1Z"/></svg>);
  if (kind==='linkedin') return (<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7.5v0M11 17v-7M11 13c0-2 1-3 2.5-3s2.5 1 2.5 3v4"/></svg>);
  if (kind==='tiktok') return (<svg viewBox="0 0 24 24" {...p}><path d="M15 4v9.5a3.5 3.5 0 1 1-3.5-3.5M15 4c0 2.5 2 4 4 4"/></svg>);
  return null;
};

const ContactPage = ({ lang, setLang, openMenu, goto }) => {
  const [form, setForm] = useStateContact({
    nom:'', email:'', telephone:'', societe:'', sujet:'general', message:'',
  });
  const [sent, setSent] = useStateContact(false);
  const { isMobile } = useBreakpoint();

  const subjects = [
    {k:'general',  fr:'Question générale',     en:'General enquiry'},
    {k:'reserver', fr:'Réserver un plateau',    en:'Book a stage'},
    {k:'ecom',     fr:'Production e-commerce',  en:'E-commerce production'},
    {k:'visite',   fr:'Visite du studio',     en:'Studio visit'},
  ];

  const team = [
    {name:'Thomas Guedj',   role:{fr:'Direction & administration',en:'Director & administration'}, mail:null},
    {name:'Benoît Cougny',  role:{fr:'Planification & production',en:'Planning & production'},     mail:null},
    {name:'Phan Vo',        role:{fr:'Image & post-production',en:'Image & post-production'},      mail:null},
    {name:'Théo Daguier',   role:{fr:'Support technique',en:'Technical support'},                   mail:null},
    {name:{fr:'Service général',en:'General enquiries'}, role:{fr:'Accueil & informations',en:'Reception & information'}, mail:'contact@e-do.studio'},
  ];

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  /* ---- Mobile layout ---- */
  if (isMobile) {
    return (
      <div style={{height:'100%',overflowY:'auto',overflowX:'hidden',background:'#000',display:'flex',flexDirection:'column',gap:1}}>
        {/* Header */}
        <div style={{display:'flex',gap:1,flexShrink:0,background:'#000'}}>
          <button onClick={()=>goto('home')} style={{flex:1,background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:12,height:52}}>
            <Wordmark size={28}/>
          </button>
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',height:52}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',color:'#141414'}}>{lang==='fr'?'EN':'FR'}</span>
          </button>
          <button onClick={openMenu} style={{flex:'0 0 52px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',height:52}}>
            <IconMenu width="18" height="18"/>
          </button>
        </div>

        {/* Form or success */}
        <div style={{background:'#000',flexShrink:0}}>
          {!sent ? (
            <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:1,background:'var(--edo-gray-200)'}}>
              {/* Title */}
              <div style={{background:'#fff',padding:'14px 16px',display:'flex',flexDirection:'column',gap:4}}>
                <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Écrivez-nous':'Write to us'}</span>
                <h1 style={{fontSize:20,fontWeight:300,letterSpacing:'-0.03em',margin:'2px 0 0',lineHeight:1}}>{lang==='fr'?'Un projet, une visite ?':'A project, a visit?'}</h1>
              </div>

              {/* Subjects — 2×2 grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'var(--edo-gray-200)'}}>
                {subjects.map((s,i)=>(
                  <button key={s.k} type="button" onClick={()=>setForm({...form,sujet:s.k})}
                    style={{background:form.sujet===s.k?'#141414':'#fff',color:form.sujet===s.k?'#fff':'#141414',border:0,cursor:'pointer',textAlign:'left',fontFamily:'inherit',padding:'12px 14px',display:'flex',alignItems:'center',gap:8,transition:'background .15s',minHeight:52}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',color:form.sujet===s.k?'rgba(255,255,255,0.6)':'var(--muted-foreground)'}}>{String(i+1).padStart(2,'0')}</span>
                    <span style={{fontSize:13,fontWeight:400,letterSpacing:'-0.01em'}}>{s[lang]}</span>
                  </button>
                ))}
              </div>

              {/* Fields */}
              {[
                {key:'nom',   placeholder:lang==='fr'?'Nom*':'Name*',           type:'text',   required:true,  span:false},
                {key:'telephone',placeholder:lang==='fr'?'Téléphone*':'Phone*', type:'tel',    required:true,  span:false},
                {key:'email', placeholder:'Email*',                             type:'email',  required:true,  span:true},
                {key:'societe',placeholder:lang==='fr'?'Société · Marque*':'Company · Brand*', type:'text', required:true, span:true},
              ].map(f=>(
                <input key={f.key} required={f.required} type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                  placeholder={f.placeholder} className="edo-bento-input"
                  style={{width:'100%',boxSizing:'border-box',background:'#fff',border:0,padding:'0 16px',fontSize:15,fontFamily:'inherit',color:'#141414',fontWeight:300,letterSpacing:'-0.01em',outline:'none',transition:'background .15s',height:52}}/>
              ))}

              {/* Message */}
              <textarea required value={form.message} onChange={e=>setForm({...form,message:e.target.value})}
                placeholder={lang==='fr'?'Votre message*':'Your message*'} className="edo-bento-input"
                style={{width:'100%',boxSizing:'border-box',background:'#fff',border:0,padding:'14px 16px',fontSize:15,fontFamily:'inherit',color:'#141414',fontWeight:300,letterSpacing:'-0.01em',outline:'none',transition:'background .15s',resize:'none',lineHeight:1.5,minHeight:120}}/>

              {/* Submit */}
              <button type="submit" style={{background:'var(--edo-orange)',color:'#fff',border:0,cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',display:'flex',alignItems:'center',justifyContent:'center',gap:12,height:52,transition:'background .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#141414'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--edo-orange)'}>
                {lang==='fr'?'Envoyer':'Send'} <IconArrowRight width="14" height="14" stroke="#fff"/>
              </button>
            </form>
          ) : (
            <div style={{background:'#fff',padding:'28px 16px',display:'flex',flexDirection:'column',gap:16}}>
              <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>✓ {lang==='fr'?'Message envoyé':'Message sent'}</span>
              <h1 style={{fontSize:30,fontWeight:300,letterSpacing:'-0.03em',margin:0,lineHeight:1.05}}>{lang==='fr'?'Merci — à très vite.':'Thanks — talk soon.'}</h1>
              <p style={{fontSize:13,color:'#595959',lineHeight:1.5,margin:0}}>{lang==='fr'?'Notre équipe vous répond sous 24 h ouvrées.':'Our team replies within 1 business day.'}</p>
              <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>{setSent(false);setForm({nom:'',email:'',telephone:'',societe:'',sujet:'general',message:''});}} style={{background:'#fff',border:'1px solid #141414',height:44,padding:'0 16px',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer'}}>{lang==='fr'?'Nouveau message':'Another message'}</button>
                <button onClick={()=>goto('gallery')} style={{background:'#141414',color:'#fff',border:0,height:44,padding:'0 16px',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer'}}>{lang==='fr'?'Voir la galerie':'See gallery'} →</button>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{background:'#fff',flexShrink:0}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--edo-gray-200)'}}>
            <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Nous trouver':'Find us'}</span>
            <p style={{margin:0,fontSize:13,color:'#141414',lineHeight:1.55}}>
              <span style={{color:'#595959',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',display:'block',marginBottom:4}}>Parc d'activités Victor Hugo · {lang==='fr'?'Bât.':'Bldg.'} 6.7</span>
              69 boulevard Victor Hugo<br/>93400 Saint-Ouen, France
            </p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'var(--edo-gray-200)'}}>
            <div style={{background:'#fff',padding:'12px 16px'}}>
              <span className="edo-cell-label" style={{marginBottom:6,display:'block'}}>{lang==='fr'?'Horaires':'Hours'}</span>
              <div style={{fontSize:12,color:'#595959',lineHeight:1.6}}>{lang==='fr'?'Lun — Ven':'Mon — Fri'}: 10—18<br/>{lang==='fr'?'Sam — Dim':'Sat — Sun'}: {lang==='fr'?'Sur demande':'On request'}</div>
            </div>
            <div style={{background:'#fff',padding:'12px 16px'}}>
              <span className="edo-cell-label" style={{marginBottom:6,display:'block'}}>{lang==='fr'?'Téléphone':'Phone'}</span>
              <a href="tel:+33144041149" style={{fontSize:14,color:'#141414',textDecoration:'none',letterSpacing:'-0.01em'}}>+33 1 44 04 11 49</a>
            </div>
          </div>
        </div>

        {/* Socials */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:'#000',flexShrink:0}}>
          {[
            {k:'instagram',label:'IG',href:'https://www.instagram.com/edostudio/'},
            {k:'linkedin', label:'LI',href:'https://www.linkedin.com/company/e-do/'},
            {k:'facebook', label:'FB',href:'https://www.facebook.com/EdoStudioAgency/'},
            {k:'tiktok',   label:'TT',href:'https://www.tiktok.com/@edostudio'},
          ].map(s=>(
            <a key={s.k} href={s.href} target="_blank" rel="noopener" style={{background:'#fff',textDecoration:'none',color:'#141414',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 12px',transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <ContactIcon kind={s.k} size={12}/>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.15em'}}>{s.label}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'190px 1fr 1fr',gridTemplateRows:'52px 1fr',gap:1,background:'#000',height:'100%',width:'100%'}}>

      {/* ========== Top row ========== */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#000',display:'flex',gap:1,alignItems:'stretch'}}>
        <button onClick={()=>goto('home')} style={{flex:1,background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 12px',transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <Wordmark size={32}/>
        </button>
      </div>
      <div style={{gridColumn:'2 / 4',gridRow:'1',background:'#000',display:'flex',gap:1,alignItems:'stretch',minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 16px',display:'flex',alignItems:'center',minWidth:0}}>
          <span className="edo-cell-label">{lang==='fr'?'Nous contacter':'Contact us'}</span>
        </div>
        <button onClick={()=>goto('plateau-live')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8,transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Plateaux':'Stages'}</span>
          <IconArrowRight width="12" height="12"/>
        </button>
        <button onClick={()=>goto('book')} style={{flex:'0 0 auto',background:'var(--edo-orange)',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:8,transition:'filter .15s'}}
          onMouseEnter={e=>e.currentTarget.style.filter='brightness(1.08)'}
          onMouseLeave={e=>e.currentTarget.style.filter='none'}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#fff'}}>{lang==='fr'?'Réserver':'Book'}</span>
          <IconArrowRight width="12" height="12" stroke="#fff"/>
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
        </button>
      </div>

      {/* ========== Left rail — contact nav / info summary ========== */}
      <div style={{gridColumn:'1',gridRow:'2',background:'#fff',overflow:'auto',display:'flex',flexDirection:'column'}}>
        <div style={{padding:16,borderBottom:'1px solid var(--edo-gray-200)'}}>
          <span className="edo-cell-label" style={{marginBottom:10,display:'block'}}>{lang==='fr'?'Nous trouver':'Find us'}</span>
          <p style={{margin:0,fontSize:13,color:'#141414',lineHeight:1.55,textWrap:'pretty'}}>
            <span style={{color:'#595959',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',display:'block',marginBottom:4}}>
              Parc d'activités Victor&nbsp;Hugo · {lang==='fr'?'Bât.':'Bldg.'} 6.7
            </span>
            69 boulevard Victor Hugo<br/>
            93400 <span style={{whiteSpace:'nowrap'}}>Saint-Ouen</span>,<br/>France
          </p>
          <div style={{margin:'10px 0 0',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.08em',color:'#595959',lineHeight:1.6,display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap'}}>
              <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:'#98D4E2',color:'#000',fontSize:10,fontWeight:700,letterSpacing:0,flexShrink:0}}>13</span>
              Garibaldi
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap'}}>
              <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:'#62259D',color:'#fff',fontSize:10,fontWeight:700,letterSpacing:0,flexShrink:0}}>14</span>
              Mairie de Saint-Ouen
            </div>
          </div>
        </div>
        <div style={{padding:16,borderBottom:'1px solid var(--edo-gray-200)'}}>
          <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Horaires':'Hours'}</span>
          <div style={{display:'flex',flexDirection:'column',gap:4,fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#595959'}}>{lang==='fr'?'Lun — Ven':'Mon — Fri'}</span><span style={{fontFamily:'var(--font-mono)',fontSize:11}}>10:00 — 18:00</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#595959'}}>{lang==='fr'?'Sam — Dim':'Sat — Sun'}</span><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#888'}}>{lang==='fr'?'Sur demande':'On request'}</span></div>
          </div>
        </div>
        <div style={{padding:16}}>
          <span className="edo-cell-label" style={{marginBottom:8,display:'block'}}>{lang==='fr'?'Téléphone':'Phone'}</span>
          <a href="tel:+33144041149" style={{fontSize:15,color:'#141414',textDecoration:'none',letterSpacing:'-0.01em'}}>+33 1 44 04 11 49</a>
        </div>
        <div style={{flex:1}}/>
        <div style={{borderTop:'1px solid var(--edo-gray-200)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'var(--edo-gray-200)'}}>
          {[
            {k:'instagram',label:'IG',href:'https://www.instagram.com/edostudio/'},
            {k:'linkedin', label:'LI',href:'https://www.linkedin.com/company/e-do/'},
            {k:'facebook', label:'FB',href:'https://www.facebook.com/EdoStudioAgency/'},
            {k:'tiktok',   label:'TT',href:'https://www.tiktok.com/@edostudio'},
          ].map(s=>(
            <a key={s.k} href={s.href} target="_blank" rel="noopener" style={{
              background:'#fff',textDecoration:'none',color:'#141414',
              display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'14px 16px',transition:'background .15s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--edo-gray-100)'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <ContactIcon kind={s.k} size={12}/>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.15em'}}>{s.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ========== Form — bento grid ========== */}
      <div style={{gridColumn:'2',gridRow:'2',background:'#000',overflow:'hidden',minHeight:0}}>
        {!sent ? (
          <form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'auto auto auto 64px 64px 64px 1fr 56px',gap:1,height:'100%',background:'var(--edo-gray-200)'}}>

            {/* Title — spans 2 cols */}
            <div style={{gridColumn:'1 / 3',background:'#fff',padding:'10px 20px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Écrivez-nous':'Write to us'}</span>
              <h1 style={{fontSize:22,fontWeight:300,letterSpacing:'-0.03em',margin:'2px 0 0',lineHeight:1}}>
                {lang==='fr'?'Un projet, une visite ?':'A project, a visit?'}
              </h1>
            </div>

            {/* Subject — 4 bento cells (2×2) — black separators around the group */}
            {subjects.map((s,i)=>{
              const col = (i%2)+1;
              const row = 2 + Math.floor(i/2);
              const shadows = [];
              // top: row 2 (first row of subjects) — black separator with title above
              if (row===2) shadows.push('0 -1px 0 #000');
              // bottom: row 3 (last row of subjects) — black separator with nom/tel below
              if (row===3) shadows.push('0 1px 0 #000');
              // vertical separators between col 1 and 2 — keep black
              if (col===2) shadows.push('-1px 0 0 #000');
              // horizontal separator between row 2 and row 3 — keep black
              if (row===3) shadows.push('0 -1px 0 #000');
              return (
                <button key={s.k} type="button" onClick={()=>setForm({...form,sujet:s.k})}
                  style={{
                    gridColumn: col, gridRow: row,
                    background:form.sujet===s.k?'#141414':'#fff',
                    color:form.sujet===s.k?'#fff':'#141414',
                    border:0,cursor:'pointer',textAlign:'left',fontFamily:'inherit',
                    padding:'10px 20px',
                    display:'flex',alignItems:'center',gap:12,
                    transition:'background .15s',minHeight:56,
                    boxShadow: shadows.join(', ') || undefined,
                  }}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.15em',color:form.sujet===s.k?'rgba(255,255,255,0.6)':'var(--muted-foreground)'}}>
                    {String(i+1).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:14,fontWeight:400,letterSpacing:'-0.01em'}}>{s[lang]}</span>
                </button>
              );
            })}

            {/* Nom */}
            <input required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}
              placeholder={lang==='fr'?'Nom*':'Name*'}
              className="edo-bento-input"
              style={{...bentoInput,gridColumn:'1',gridRow:'4'}}/>

            {/* Téléphone */}
            <input required type="tel" value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})}
              placeholder={lang==='fr'?'Téléphone*':'Phone*'}
              className="edo-bento-input"
              style={{...bentoInput,gridColumn:'2',gridRow:'4'}}/>

            {/* Email — spans 2 cols */}
            <input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
              placeholder="Email*"
              className="edo-bento-input"
              style={{...bentoInput,gridColumn:'1 / 3',gridRow:'5'}}/>

            {/* Société — spans 2 cols */}
            <input required value={form.societe} onChange={e=>setForm({...form,societe:e.target.value})}
              placeholder={lang==='fr'?'Société · Marque*':'Company · Brand*'}
              className="edo-bento-input"
              style={{...bentoInput,gridColumn:'1 / 3',gridRow:'6'}}/>

            {/* Message — spans 2 cols, fills remaining height */}
            <textarea required value={form.message} onChange={e=>setForm({...form,message:e.target.value})}
              placeholder={lang==='fr'?'Votre message*':'Your message*'}
              className="edo-bento-input"
              style={{...bentoInput,gridColumn:'1 / 3',gridRow:'7',resize:'none',fontFamily:'inherit',lineHeight:1.5,padding:'16px 20px',height:'100%'}}/>

            {/* Submit — full-width button */}
            <button type="submit" style={{
              gridColumn:'1 / 3',gridRow:'8',
              background:'var(--edo-orange)',color:'#fff',border:0,cursor:'pointer',
              fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.25em',textTransform:'uppercase',
              display:'flex',alignItems:'center',justifyContent:'center',gap:14,
              transition:'background .15s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#141414'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--edo-orange)'}>
              {lang==='fr'?'Envoyer':'Send'} <IconArrowRight width="16" height="16" stroke="#fff"/>
            </button>
          </form>
        ) : (
          <div style={{padding:'28px 28px 32px',display:'flex',flexDirection:'column',gap:16,height:'100%',justifyContent:'center',alignItems:'flex-start'}}>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>✓ {lang==='fr'?'Message envoyé':'Message sent'}</span>
            <h1 style={{fontSize:40,fontWeight:300,letterSpacing:'-0.03em',margin:0,lineHeight:1.05,maxWidth:500}}>
              {lang==='fr'?'Merci — à très vite.':'Thanks — talk soon.'}
            </h1>
            <p style={{fontSize:14,color:'#595959',maxWidth:460,lineHeight:1.5,margin:0}}>
              {lang==='fr'
                ? "Notre équipe vous répond sous 24 h ouvrées. En attendant, vous pouvez parcourir la galerie ou explorer les plateaux."
                : "Our team replies within 1 business day. In the meantime, browse the gallery or explore the stages."}
            </p>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <button onClick={()=>{setSent(false); setForm({nom:'',email:'',telephone:'',societe:'',sujet:'general',message:''});}}
                style={{background:'#fff',border:'1px solid #141414',height:42,padding:'0 20px',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer'}}>
                {lang==='fr'?'Nouveau message':'Another message'}
              </button>
              <button onClick={()=>goto('gallery')}
                style={{background:'#141414',color:'#fff',border:0,height:42,padding:'0 20px',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer'}}>
                {lang==='fr'?'Voir la galerie':'See gallery'} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Right column — map + team ========== */}
      <div style={{gridColumn:'3',gridRow:'2',display:'grid',gridTemplateRows:'1fr 1fr',gap:1,background:'#000',overflow:'hidden'}}>

        {/* Map */}
        <div style={{background:'#e8dfcf',position:'relative',overflow:'hidden'}}>
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
            {/* Streets */}
            <g stroke="#c8ba9e" strokeWidth="12" fill="none">
              <line x1="-20" y1="80" x2="420" y2="80"/>
              <line x1="-20" y1="210" x2="420" y2="210"/>
              <line x1="120" y1="-20" x2="120" y2="320"/>
              <line x1="280" y1="-20" x2="280" y2="320"/>
            </g>
            <g stroke="#d4c8ad" strokeWidth="4" fill="none">
              <line x1="-20" y1="140" x2="420" y2="140"/>
              <line x1="200" y1="-20" x2="200" y2="320"/>
              <line x1="60" y1="-20" x2="60" y2="320"/>
              <line x1="350" y1="-20" x2="350" y2="320"/>
            </g>
            {/* Blocks */}
            <g fill="#dbcfb4">
              <rect x="130" y="90" width="60" height="40"/>
              <rect x="210" y="90" width="60" height="40"/>
              <rect x="130" y="150" width="60" height="50"/>
              <rect x="210" y="150" width="60" height="50"/>
              <rect x="70" y="150" width="40" height="50"/>
              <rect x="290" y="150" width="50" height="50"/>
            </g>
            {/* E-Do pin */}
            <g transform="translate(200,150)">
              <circle r="22" fill="var(--edo-orange)" opacity="0.2"/>
              <circle r="9" fill="var(--edo-orange)"/>
              <circle r="3" fill="#fff"/>
            </g>
          </svg>

          <div style={{position:'absolute',bottom:12,left:12,right:12,padding:'10px 12px',background:'rgba(255,255,255,0.95)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,fontWeight:500,letterSpacing:'-0.01em'}}>69 bd Victor Hugo · Bât. 6.7</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#595959',letterSpacing:'0.05em'}}>93400 SAINT-OUEN · M°13 GARIBALDI / M°14 MAIRIE ST-OUEN</div>
            </div>
            <a href="#" style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--edo-orange)',textDecoration:'none'}}>
              {lang==='fr'?'Itinéraire →':'Directions →'}
            </a>
          </div>
        </div>

        {/* Team */}
        <div style={{background:'#141414',color:'#fff',padding:24,display:'flex',flexDirection:'column',gap:14}}>
          <span className="edo-cell-label" style={{color:'rgba(255,255,255,0.7)'}}>{lang==='fr'?'L’équipe':'The team'}</span>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {team.map((t,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  <span style={{fontSize:14,letterSpacing:'-0.01em'}}>{typeof t.name==='string' ? t.name : t.name[lang]}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.55)'}}>{t.role[lang]}</span>
                </div>
                {t.mail && <a href={`mailto:${t.mail}`} style={{alignSelf:'center',color:'var(--edo-orange)',textDecoration:'none',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.05em'}}>{t.mail}</a>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== Bottom marquee removed ========== */}
    </div>
  );
};

const inputWrap = {display:'flex',flexDirection:'column',gap:6};
const inputStyle = {
  width:'100%',boxSizing:'border-box',
  height:40,padding:'0 12px',
  border:'1px solid var(--edo-gray-200)',background:'#fff',
  fontSize:13,fontFamily:'inherit',color:'#141414',
  outline:'none',transition:'border .15s',
};
const bentoInput = {
  width:'100%',boxSizing:'border-box',
  background:'#fff',border:0,
  padding:'0 20px',
  fontSize:15,fontFamily:'inherit',color:'#141414',fontWeight:300,letterSpacing:'-0.01em',
  outline:'none',transition:'background .15s',
};

Object.assign(window, { ContactPage });
