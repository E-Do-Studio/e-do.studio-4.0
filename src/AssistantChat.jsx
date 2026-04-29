/* =================================================================
   AssistantChat — Full conversational interface, connected to Claude
   Lives in the grid cell 10/13 × 4/6 (same slot as before)
   Two modes:
     - "prompt"  : welcome state w/ quick replies (compact)
     - "chat"    : conversation w/ bubbles, auto-scroll, typing dots
   ================================================================= */

const SYSTEM_PROMPT = `Tu es l'assistant virtuel d'E-DO Studio, un studio photo/vidéo à Saint-Ouen (69 boulevard Victor Hugo, Bâtiment 6.7, Parc d'activités Victor Hugo, 93400 Saint-Ouen · M° Garibaldi L13 ou Mairie de Saint-Ouen L14).
Tu renseignes sur : tarifs (plateaux à partir de 450€/jour, cyclorama 650€/jour, post-production sur devis), disponibilités, visite du studio, services (5 plateaux, cyclorama 30m², post-production photo & vidéo, location de machines e-commerce automatisées).
Ton ton : pro, concis, chaleureux. Utilise "vous". Maximum 3-4 phrases par réponse. Propose toujours de contacter l'équipe (contact@e-do.studio · +33 1 44 04 11 49) pour un devis personnalisé ou une visite.
Réponds TOUJOURS dans la langue du dernier message de l'utilisateur (français ou anglais).`;

const AssistantChat = ({ lang, gc, gr, badge }) => {
  const [mode, setMode] = React.useState('prompt');        // 'prompt' | 'chat'
  const [messages, setMessages] = React.useState([]);       // [{role, content}]
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Auto-scroll when new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || loading) return;

    const newMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setInput('');
    setMode('chat');
    setLoading(true);

    try {
      const reply = await window.claude.complete({
        messages: [
          { role: 'user', content: SYSTEM_PROMPT + '\n\n---\n\n' + trimmed }
        ].concat(
          newMessages.slice(1).map(m => ({ role: m.role, content: m.content }))
        ),
      });
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: lang === 'fr'
          ? 'Désolé, je n\'ai pas pu traiter votre demande. Contactez-nous directement à contact@e-do.studio.'
          : 'Sorry, I couldn\'t process your request. Contact us directly at contact@e-do.studio.'
      }]);
    }
    setLoading(false);
  };

  const reset = () => {
    setMessages([]);
    setMode('prompt');
    setInput('');
  };

  const quickReplies = lang === 'fr'
    ? ['Tarifs cyclo', 'Dispos semaine prochaine', 'Livraison post-prod', 'Visite studio']
    : ['Cyclo rates', 'Next-week availability', 'Post-prod delivery', 'Studio tour'];

  return (
    <div
      onMouseEnter={e => {
        const inp = e.currentTarget.querySelector('.edo-assistant-input');
        if (inp) inp.style.setProperty('--ph-color', 'var(--edo-orange)');
      }}
      onMouseLeave={e => {
        const inp = e.currentTarget.querySelector('.edo-assistant-input');
        if (inp) inp.style.setProperty('--ph-color', '');
      }}
      style={{
      gridColumn: gc || '10 / 13', gridRow: gr || '4 / 6',
      background: '#fff',
      padding: '14px 18px 12px',
      display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden',
      minHeight: 0, position: 'relative',
    }}>
      {badge!=null && (
        <span aria-hidden style={{
          position:'absolute',top:6,right:6,zIndex:30,
          background:'#FF6B35',color:'#fff',
          fontFamily:'var(--font-mono)',fontSize:11,fontWeight:600,letterSpacing:'0.05em',
          padding:'3px 8px',pointerEvents:'none',
          boxShadow:'0 1px 4px rgba(0,0,0,0.35)',borderRadius:2,
        }}>#{badge}</span>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="edo-cell-label">{lang === 'fr' ? 'Assistant' : 'Assistant'}</span>
          {mode === 'chat' && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: loading ? '#f5a623' : 'var(--edo-orange)',
              animation: loading ? 'edo-pulse 1.2s ease-in-out infinite' : 'none',
            }} />
          )}
        </div>
        {mode === 'chat' && (
          <button onClick={reset} style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#888', padding: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#141414'}
            onMouseLeave={e => e.currentTarget.style.color = '#888'}>
            {lang === 'fr' ? '↺ Reset' : '↺ Reset'}
          </button>
        )}
      </div>

      {/* Content area — either prompt or conversation */}
      {mode === 'prompt' ? (
        <>
          <div style={{
            fontSize: 18, fontWeight: 400, letterSpacing: '-0.015em',
            lineHeight: 1.2, color: '#141414',
          }}>
            {lang === 'fr'
              ? <>Un <span style={{ color: 'var(--edo-orange)' }}>devis</span> ? Une <span style={{ color: 'var(--edo-orange)' }}>visite</span> ? Une question sur la <span style={{ color: 'var(--edo-orange)' }}>post-production</span> ?</>
              : <>A <span style={{ color: 'var(--edo-orange)' }}>quote</span>? A <span style={{ color: 'var(--edo-orange)' }}>tour</span>? A question about <span style={{ color: 'var(--edo-orange)' }}>post-prod</span>?</>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickReplies.map(txt => (
              <button key={txt} onClick={() => send(txt)} style={{
                border: '1px solid #e0e0e0', background: '#fff', padding: '5px 10px',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#595959', cursor: 'pointer',
                borderRadius: 999, transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#141414'; e.currentTarget.style.color = '#141414'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#595959'; }}>
                {txt}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          gap: 10, paddingRight: 4, minHeight: 0,
          scrollbarWidth: 'thin', scrollbarColor: '#e0e0e0 transparent',
        }}>
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && <TypingBubble />}
        </div>
      )}

      {/* Input — always visible */}
      <form onSubmit={e => { e.preventDefault(); send(input); }}
        style={{
        marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10,
        borderTop: '1px solid #141414', paddingTop: 10, flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
          placeholder={lang === 'fr' ? 'Écrire votre demande…' : 'Type your request…'}
          className="edo-assistant-input"
          style={{
            border: 0, flex: 1, fontSize: 13, fontFamily: 'inherit',
            background: 'transparent', outline: 'none', color: '#141414',
            minWidth: 0, opacity: loading ? 0.5 : 1,
          }} />
        <button type="submit" disabled={loading || !input.trim()} style={{
          width: 28, height: 28, border: 0, background: 'transparent',
          cursor: (loading || !input.trim()) ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, opacity: (loading || !input.trim()) ? 0.3 : 1,
        }}>
          <IconArrowRight width="16" height="16" stroke="var(--edo-orange)" />
        </button>
      </form>

      <style>{`
        @keyframes edo-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes edo-typing-dot {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        .edo-assistant-input::placeholder {
          color: var(--ph-color, #888);
          transition: color .2s ease;
        }
      `}</style>
    </div>
  );
};

/* ---------- Bubble ---------- */
const Bubble = ({ role, content }) => {
  const isUser = role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        maxWidth: '85%',
        padding: isUser ? '7px 11px' : '4px 0',
        background: isUser ? '#141414' : 'transparent',
        color: isUser ? '#fff' : '#141414',
        fontSize: 12.5,
        lineHeight: 1.45,
        letterSpacing: '-0.005em',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {!isUser && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--edo-orange)', marginBottom: 2,
          }}>E-DO</div>
        )}
        {content}
      </div>
    </div>
  );
};

/* ---------- Typing indicator ---------- */
const TypingBubble = () => (
  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
    <div style={{ padding: '4px 0' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--edo-orange)', marginBottom: 4,
      }}>E-DO</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 14 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%', background: '#141414',
            display: 'inline-block',
            animation: `edo-typing-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { AssistantChat });
