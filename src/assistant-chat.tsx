import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouterState } from '@tanstack/react-router';
import { IconArrowRight, cn } from './ui';
import type { Lang, ChatMessage } from './types';
import { assistant as assistantMsg, common } from './i18n/messages';
import { supabase } from './lib/supabase';
import { createBooking } from './lib/bookings';
import { BOOK_PLATEAUX, fmtEUR, isValidSiren, type CreateBookingInput } from './lib/booking-engine';

const MAX_INPUT_CHARS = 1500;

const getQuickReplies = (lang: Lang) => lang === 'fr'
  ? ['Réservation guidée', 'Tarifs cyclo', 'Dispos semaine prochaine', 'Livraison post-prod', 'Visite studio']
  : ['Guided booking', 'Cyclo rates', 'Next-week availability', 'Post-prod delivery', 'Studio tour'];

type ChatError = 'rate_limited' | 'other';

interface ChatResponse {
  reply?: string;
  error?: string;
  bookingProposal?: CreateBookingInput | null;
  suggestions?: string[];
  collectContact?: boolean;
}

// Backend regex (`/^\/[a-z0-9/_-]*$/i`) accepts only clean paths — strip
// anything weirder (query, hash, accents) before sending.
const CURRENT_PAGE_RE = /^\/[a-z0-9/_-]*$/i;
const sanitizeCurrentPage = (path: string): string | undefined => {
  if (!path) return undefined;
  const stripped = path.split('?')[0].split('#')[0];
  return CURRENT_PAGE_RE.test(stripped) && stripped.length <= 200 ? stripped : undefined;
};

const sendAssistantMessage = async (
  messages: ChatMessage[],
  lang: Lang,
  currentPage: string | undefined,
): Promise<{ reply: string; bookingProposal?: CreateBookingInput | null; suggestions?: string[]; collectContact?: boolean } | { error: ChatError }> => {
  const { data, error } = await supabase.functions.invoke<ChatResponse>('chat', {
    body: { messages, lang, currentPage },
  });

  if (error) {
    // supabase-js exposes the HTTP status on FunctionsHttpError via context.response
    const ctx = (error as unknown as { context?: { response?: Response } }).context;
    const status = ctx?.response?.status;
    if (status === 429) return { error: 'rate_limited' };
    // Some payloads return 200 with { error } — covered below.
    return { error: 'other' };
  }

  if (data?.error === 'rate_limited') return { error: 'rate_limited' };
  if (!data?.reply) return { error: 'other' };
  return {
    reply: data.reply,
    bookingProposal: data.bookingProposal ?? null,
    suggestions: data.suggestions ?? [],
    collectContact: data.collectContact ?? false,
  };
};

interface AssistantHeaderProps {
  lang: Lang;
  mode: 'prompt' | 'chat';
  loading: boolean;
  onReset: () => void;
}

const AssistantHeader = ({ lang: _lang, mode, loading, onReset }: AssistantHeaderProps) => (
  <div className="flex shrink-0 items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="edo-cell-label">Assistant</span>
      {mode === 'chat' && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            loading ? 'animate-pulse bg-primary' : 'bg-primary'
          )}
        />
      )}
    </div>

    {mode === 'chat' && (
      <button
        onClick={onReset}
        className="edo-focus-ring cursor-pointer border-0 bg-transparent p-0 font-mono text-micro uppercase tracking-code text-muted-foreground transition-colors hover:text-foreground"
      >
        ↺ Reset
      </button>
    )}
  </div>
);

interface AssistantPromptProps {
  lang: Lang;
  onSend: (text: string) => void;
}

const AssistantPrompt = ({ lang, onSend }: AssistantPromptProps) => (
  <>
    <div className="text-cell font-normal leading-snug tracking-headline text-foreground">
      {lang === 'fr' ? (
        <>Un <span className="text-primary">devis</span> ? Une <span className="text-primary">visite</span> ? Une question sur la <span className="text-primary">post-production</span> ?</>
      ) : (
        <>A <span className="text-primary">quote</span>? A <span className="text-primary">tour</span>? A question about <span className="text-primary">post-prod</span>?</>
      )}
    </div>

    <div className="flex flex-wrap gap-1.5">
      {getQuickReplies(lang).map((reply) => (
        <QuickReplyButton key={reply} onClick={() => onSend(reply)}>
          {reply}
        </QuickReplyButton>
      ))}
    </div>
  </>
);

interface QuickReplyButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

const QuickReplyButton = ({ children, onClick }: QuickReplyButtonProps) => (
  <button
    onClick={onClick}
    className="edo-focus-ring cursor-pointer rounded-full border border-border bg-white px-2.5 py-1.5 font-mono text-micro uppercase tracking-ui text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
  >
    {children}
  </button>
);

interface ChatBubbleProps {
  role: string;
  content: string;
}

const isSafeHref = (href: unknown): href is string =>
  typeof href === 'string' && /^(https?:|mailto:)/i.test(href);

const assistantMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="m-0 mb-2 text-detail leading-normal last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-nano uppercase tracking-code text-primary first:mt-0">{children}</div>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-nano uppercase tracking-code text-primary first:mt-0">{children}</div>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-nano uppercase tracking-code text-primary first:mt-0">{children}</div>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-nano uppercase tracking-code text-primary first:mt-0">{children}</div>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="m-0 mb-2 list-disc pl-4 text-detail leading-normal last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="m-0 mb-2 list-decimal pl-4 text-detail leading-normal last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-0.5 text-detail leading-normal">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (!isSafeHref(href)) return <>{children}</>;
    const isMail = href.toLowerCase().startsWith('mailto:');
    const isInternal = /^https?:\/\/(www\.)?e-do\.studio/i.test(href);
    return (
      <a
        href={href}
        target={isMail || isInternal ? '_self' : '_blank'}
        rel={isMail || isInternal ? undefined : 'noopener noreferrer'}
        className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-foreground"
      >
        {children}
      </a>
    );
  },
};

const ALLOWED_MARKDOWN_ELEMENTS = ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3', 'h4'];

const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-message break-words text-detail leading-normal tracking-copy-tight',
          isUser
            ? 'bg-foreground px-3 py-2 text-white whitespace-pre-wrap'
            : 'bg-transparent py-1 text-foreground'
        )}
      >
        {!isUser && (
          <div className="mb-0.5 font-mono text-nano uppercase tracking-code text-primary">
            E-DO
          </div>
        )}
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            allowedElements={ALLOWED_MARKDOWN_ELEMENTS}
            unwrapDisallowed
            components={assistantMarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

const TypingBubble = () => (
  <div className="flex justify-start">
    <div className="py-1">
      <div className="mb-1 font-mono text-nano uppercase tracking-code text-primary">
        E-DO
      </div>
      <div className="flex h-3.5 items-center gap-1">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="edo-typing-dot h-1 w-1 rounded-full bg-foreground" />
        ))}
      </div>
    </div>
  </div>
);

interface AssistantInputProps {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  lang: Lang;
  onSend: (text: string) => void;
  inputRef: React.Ref<HTMLInputElement>;
}

const AssistantInput = ({ input, setInput, loading, lang, onSend, inputRef }: AssistantInputProps) => (
  <form
    name="assistant-chat"
    aria-label="Assistant chat"
    onSubmit={(event) => {
      event.preventDefault();
      onSend(input);
    }}
    className="mt-auto flex shrink-0 items-center gap-2.5 border-t border-hairline pt-2.5"
  >
    <input
      ref={inputRef}
      name="message"
      value={input}
      onChange={(event) => setInput(event.target.value.slice(0, MAX_INPUT_CHARS))}
      disabled={loading}
      maxLength={MAX_INPUT_CHARS}
      placeholder={assistantMsg.placeholder[lang]}
      className="min-w-0 flex-1 border-0 bg-transparent font-sans text-detail text-foreground caret-primary opacity-100 outline-none placeholder:text-muted-foreground disabled:opacity-50"
    />
    <button
      type="submit"
      disabled={loading || !input.trim()}
      aria-label={common.send[lang]}
      className="edo-focus-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted-foreground"
    >
      <IconArrowRight width="16" height="16" />
    </button>
  </form>
);

const MONTHS_SHORT: Record<Lang, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const fmtRecapDate = (d: { y: number; m: number; d: number } | null, lang: Lang) =>
  d ? `${d.d} ${MONTHS_SHORT[lang][d.m]} ${d.y}` : '—';

interface ContactFormProps {
  lang: Lang;
  onSubmit: (message: string) => void;
}

const ContactForm = ({ lang, onSubmit }: ContactFormProps) => {
  const [f, setF] = useState({
    prenom: '', nom: '', email: '', tel: '',
    societe: '', adresseFacturation: '', marque: '', siren: '', autresInfos: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.prenom.trim() || !f.nom.trim() || !f.email.trim() || !f.tel.trim() || !f.societe.trim() || !f.adresseFacturation.trim()) {
      setErr(assistantMsg.contactErrRequired[lang]);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setErr(assistantMsg.contactErrEmail[lang]);
      return;
    }
    if (f.siren.trim() && !isValidSiren(f.siren)) {
      setErr(assistantMsg.contactErrSiren[lang]);
      return;
    }
    const parts = [
      `Prénom: ${f.prenom.trim()}`,
      `Nom: ${f.nom.trim()}`,
      `Email: ${f.email.trim()}`,
      `Téléphone: ${f.tel.trim()}`,
      `Société: ${f.societe.trim()}`,
      `Adresse de facturation: ${f.adresseFacturation.trim()}`,
    ];
    if (f.marque.trim()) parts.push(`Marque: ${f.marque.trim()}`);
    parts.push(f.siren.trim() ? `SIREN: ${f.siren.trim()}` : 'SIREN: aucun');
    if (f.autresInfos.trim()) parts.push(`Autres infos: ${f.autresInfos.trim()}`);
    onSubmit('Mes coordonnées — ' + parts.join(' · '));
  };

  const inputCls =
    'w-full border border-border bg-white px-2 py-1.5 text-detail text-foreground outline-none transition-colors focus:border-foreground';

  return (
    <form onSubmit={submit} className="shrink-0 border border-border bg-white p-3">
      <div className="mb-2 font-mono text-nano uppercase tracking-code text-primary">
        {assistantMsg.contactFormTitle[lang]}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <input className={inputCls} placeholder={assistantMsg.contactFirstName[lang]} value={f.prenom} onChange={upd('prenom')} />
          <input className={inputCls} placeholder={assistantMsg.contactLastName[lang]} value={f.nom} onChange={upd('nom')} />
        </div>
        <input className={inputCls} type="email" placeholder={assistantMsg.contactEmail[lang]} value={f.email} onChange={upd('email')} />
        <input className={inputCls} type="tel" placeholder={assistantMsg.contactPhone[lang]} value={f.tel} onChange={upd('tel')} />
        <input className={inputCls} placeholder={assistantMsg.contactCompany[lang]} value={f.societe} onChange={upd('societe')} />
        <input className={inputCls} placeholder={assistantMsg.contactBillingAddress[lang]} value={f.adresseFacturation} onChange={upd('adresseFacturation')} />
        <input className={inputCls} placeholder={assistantMsg.contactBrand[lang]} value={f.marque} onChange={upd('marque')} />
        <input className={inputCls} placeholder={assistantMsg.contactSiren[lang]} value={f.siren} onChange={upd('siren')} />
        <input className={inputCls} placeholder={assistantMsg.contactNotes[lang]} value={f.autresInfos} onChange={upd('autresInfos')} />
      </div>
      {err && <div className="mt-1.5 text-micro text-primary">{err}</div>}
      <button
        type="submit"
        className="edo-focus-ring mt-2 flex w-full cursor-pointer items-center justify-center border-0 bg-primary px-3 py-2 text-detail text-white transition-opacity hover:opacity-90"
      >
        {assistantMsg.contactSubmit[lang]}
      </button>
    </form>
  );
};

interface BookingRecapCardProps {
  proposal: CreateBookingInput;
  lang: Lang;
  cgv: boolean;
  setCgv: (v: boolean) => void;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
}

const BookingRecapCard = ({ proposal, lang, cgv, setCgv, busy, error, onConfirm }: BookingRecapCardProps) => {
  const ttc = Math.round(proposal.quote.total * 1.2);
  return (
    <div className="shrink-0 border border-border bg-white p-3">
      <div className="mb-2 font-mono text-nano uppercase tracking-code text-primary">
        {assistantMsg.bookingRecapTitle[lang]}
      </div>

      <div className="mb-2 flex flex-col gap-1">
        {proposal.sessions.map((s, i) => {
          const px = BOOK_PLATEAUX.find((p) => p.k === s.plateauKey);
          return (
            <div key={i} className="flex justify-between gap-2 text-detail">
              <span className="text-foreground">
                {px ? px[lang] : s.plateauKey} · {fmtRecapDate(s.date, lang)}
                {s.arrivalHour != null ? ` · ${s.arrivalHour}h` : ''}
              </span>
              <span className="text-muted-foreground">{s.hours}h</span>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex flex-col gap-0.5 border-t border-hairline pt-2">
        {proposal.quote.rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-2 text-micro">
            <span className="text-muted-foreground">{r.lbl}</span>
            <span className="text-foreground">{r.onReq ? '—' : `${fmtEUR(r.amt)} €`}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between border-t border-hairline pt-2 text-detail font-semibold text-foreground">
        <span>{assistantMsg.bookingTotalHT[lang]}</span>
        <span>{fmtEUR(proposal.quote.total)} €</span>
      </div>
      <div className="mb-2 text-right font-mono text-micro text-muted-foreground">
        {fmtEUR(ttc)} € {assistantMsg.bookingTotalTTC[lang]}
      </div>

      <div className="mb-2 border-t border-hairline pt-2 text-micro text-muted-foreground">
        {assistantMsg.bookingContact[lang]}: {proposal.contact.prenom} {proposal.contact.nom} · {proposal.contact.email} · {proposal.contact.tel}
        {proposal.contact.siren ? ` · SIREN ${proposal.contact.siren}` : ''}
      </div>

      <div className="mb-2 text-micro italic text-muted-foreground">
        {assistantMsg.bookingEstimateNote[lang]}
      </div>

      <label className="mb-2 flex cursor-pointer items-start gap-2 text-micro text-foreground">
        <input
          type="checkbox"
          checked={cgv}
          onChange={(e) => setCgv(e.target.checked)}
          className="mt-0.5 accent-primary"
        />
        <span>{assistantMsg.bookingCgv[lang]}</span>
      </label>

      {error && <div className="mb-2 text-micro text-primary">{error}</div>}

      <button
        type="button"
        disabled={!cgv || busy}
        onClick={onConfirm}
        className="edo-focus-ring flex w-full cursor-pointer items-center justify-center border-0 bg-primary px-3 py-2 text-detail text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? assistantMsg.bookingConfirming[lang] : assistantMsg.bookingConfirm[lang]}
      </button>
    </div>
  );
};

interface AssistantChatProps {
  lang: Lang;
  badge?: number | string;
  className?: string;
}

const AssistantChat = ({ lang, badge, className = '' }: AssistantChatProps) => {
  const [mode, setMode] = useState<'prompt' | 'chat'>('prompt');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<CreateBookingInput | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [collectContact, setCollectContact] = useState(false);
  const [cgv, setCgv] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPath = useRouterState({ select: (s) => s.resolvedLocation?.pathname ?? '' });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = (text || '').trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setMode('chat');
    setLoading(true);
    setSuggestions([]);
    setCollectContact(false);

    try {
      const result = await sendAssistantMessage(nextMessages, lang, sanitizeCurrentPage(currentPath));
      if ('reply' in result) {
        setMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: result.reply }]);
        setSuggestions(result.suggestions ?? []);
        setCollectContact(result.collectContact ?? false);
        if (result.bookingProposal) {
          setProposal(result.bookingProposal);
          setCgv(false);
          setBookingErr(null);
        }
      } else {
        const fallback = result.error === 'rate_limited'
          ? assistantMsg.rateLimited[lang]
          : assistantMsg.errorFallback[lang];
        setMessages((currentMessages) => [...currentMessages, {
          role: 'assistant',
          content: fallback,
        }]);
      }
    } catch (_error) {
      setMessages((currentMessages) => [...currentMessages, {
        role: 'assistant',
        content: assistantMsg.errorFallback[lang],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!proposal || !cgv || bookingBusy) return;
    setBookingBusy(true);
    setBookingErr(null);
    try {
      const result = await createBooking({ ...proposal, mode: 'booking' });
      setProposal(null);
      setCgv(false);
      setMessages((currentMessages) => [...currentMessages, {
        role: 'assistant',
        content: assistantMsg.bookingSuccess[lang].replace('{ref}', result.reference),
      }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const isConflict = msg.includes('réservé') || msg.includes('already booked');
      setBookingErr(isConflict ? assistantMsg.bookingConflict[lang] : assistantMsg.bookingError[lang]);
    } finally {
      setBookingBusy(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setMode('prompt');
    setInput('');
    setProposal(null);
    setSuggestions([]);
    setCollectContact(false);
    setCgv(false);
    setBookingErr(null);
  };

  return (
    <div
      className={cn(
        'edo-assistant-card group relative flex h-full w-full flex-col gap-2.5 overflow-hidden bg-white px-cell pb-3 pt-3.5',
        className || 'col-start-10 col-end-13 row-start-4 row-end-6 min-h-0'
      )}
    >
      {badge != null && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-30 rounded-sm bg-primary px-2 py-1 font-mono text-caption font-semibold tracking-caption text-white shadow-md">
          #{badge}
        </span>
      )}

      <AssistantHeader lang={lang} mode={mode} loading={loading} onReset={reset} />

      {mode === 'prompt' ? (
        <AssistantPrompt lang={lang} onSend={send} />
      ) : (
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-thin"
        >
          {messages.map((message, index) => (
            <ChatBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
          ))}
          {loading && <TypingBubble />}

          {!loading && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <QuickReplyButton key={s} onClick={() => send(s)}>
                  {s}
                </QuickReplyButton>
              ))}
            </div>
          )}

          {collectContact && !proposal && (
            <ContactForm lang={lang} onSubmit={(m) => send(m)} />
          )}

          {proposal && (
            <BookingRecapCard
              proposal={proposal}
              lang={lang}
              cgv={cgv}
              setCgv={setCgv}
              busy={bookingBusy}
              error={bookingErr}
              onConfirm={confirmBooking}
            />
          )}
        </div>
      )}

      <AssistantInput
        input={input}
        setInput={setInput}
        loading={loading}
        lang={lang}
        onSend={send}
        inputRef={inputRef}
      />
    </div>
  );
};

export { AssistantChat };
export default AssistantChat;
