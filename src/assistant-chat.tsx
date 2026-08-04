import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ArrowRight, Plus, Trash2, X } from 'lucide-react';
import type { Lang, ChatMessage } from './types';
import { Trans } from 'react-i18next';
import { getT } from './i18n';
import { useT } from './i18n/use-t';
import { supabase } from './lib/supabase';
import { useChatSessions, type ChatSession } from './lib/use-chat-sessions';
import { createBooking } from './lib/bookings';
import { BOOK_PLATEAUX, type CreateBookingInput } from './lib/booking-engine';
import { validateIdentity } from './lib/booking-schema';
import { fmtEUR } from './lib/format';

const MAX_INPUT_CHARS = 1500;

const getQuickReplies = (lang: Lang) => {
  const t = getT(lang);
  return [
    t('assistant.quickReplyBooking'),
    t('assistant.quickReplyRates'),
    t('assistant.quickReplyAvailability'),
    t('assistant.quickReplyDelivery'),
    t('assistant.quickReplyTour'),
  ];
};

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
  return CURRENT_PAGE_RE.test(stripped) && stripped.length <= 200
    ? stripped
    : undefined;
};

const sendAssistantMessage = async (
  messages: ChatMessage[],
  lang: Lang,
  currentPage: string | undefined,
): Promise<
  | {
      reply: string;
      bookingProposal?: CreateBookingInput | null;
      suggestions?: string[];
      collectContact?: boolean;
    }
  | { error: ChatError }
> => {
  const { data, error } = await supabase.functions.invoke<ChatResponse>(
    'chat',
    {
      body: { messages, lang, currentPage },
    },
  );

  if (error) {
    // supabase-js exposes the HTTP status on FunctionsHttpError via context.response
    const ctx = (error as unknown as { context?: { response?: Response } })
      .context;
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
  historyCount: number;
  onNewSession: () => void;
  onOpenHistory: () => void;
}

const AssistantHeader = ({
  lang,
  mode,
  loading,
  historyCount,
  onNewSession,
  onOpenHistory,
}: AssistantHeaderProps) => {
  const t = useT();
  return (
    <div className="flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Assistant
        </span>
        {mode === 'chat' && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              loading ? 'animate-pulse bg-primary' : 'bg-primary',
            )}
          />
        )}
      </div>

      <div className="-mr-1 flex items-center gap-0.5">
        {historyCount > 0 && (
          <Button
            type="button"
            onClick={onOpenHistory}
            variant="ghost"
            className="h-auto gap-1.5 px-1.5 py-1 tracking-wider text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {t('assistant.history')}
            <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-muted px-1 text-xs text-muted-foreground">
              {historyCount}
            </span>
          </Button>
        )}
        {mode === 'chat' && (
          <Button
            type="button"
            onClick={onNewSession}
            aria-label={t('assistant.newConversation')}
            title={t('assistant.newConversation')}
            className="flex h-7 w-7  bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus width="15" height="15" />
          </Button>
        )}
      </div>
    </div>
  );
};

const formatRelative = (ts: number, lang: Lang): string => {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return getT(lang)('assistant.justNow');
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return rtf.format(-diffDay, 'day');
  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
  }).format(ts);
};

interface ChatSessionListProps {
  lang: Lang;
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}

const ChatSessionList = ({
  lang,
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: ChatSessionListProps) => {
  const t = useT();
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4.5 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('assistant.history')}
        </span>
        <Button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          variant="ghost"
          size="icon-sm"
          className="-mr-1 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <X width="16" height="16" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        <Button
          type="button"
          onClick={onNew}
          variant="cell"
          size="cell"
          className="group flex-row items-center gap-2.5 border-b border-border bg-transparent px-4.5 py-3"
        >
          <Plus width="15" height="15" className="text-primary" />
          <span className="text-sm leading-none text-foreground">
            {t('assistant.newConversation')}
          </span>
        </Button>

        {sessions.length === 0 ? (
          <p className="px-4.5 py-4 text-sm leading-normal text-muted-foreground">
            {t('assistant.historyEmpty')}
          </p>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeId;
            return (
              <div
                key={session.id}
                className={cn(
                  'group/row flex items-center gap-2 border-b border-border transition-colors',
                  isActive ? 'bg-muted' : 'hover:bg-muted',
                )}
              >
                <Button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  variant="cell"
                  size="cell"
                  className="min-w-0 flex-1 gap-1 bg-transparent py-2.5 pl-4.5 pr-2"
                >
                  <span className="w-full truncate text-sm leading-none text-foreground">
                    {session.title || t('assistant.untitledConversation')}
                  </span>
                  <span className="text-xs leading-none text-muted-foreground">
                    {formatRelative(session.updatedAt, lang)}
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={() => onDelete(session.id)}
                  aria-label={t('assistant.deleteConversation')}
                  variant="ghost"
                  size="icon-sm"
                  className="mr-1.5 text-muted-foreground opacity-0 hover:bg-transparent hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
                >
                  <Trash2 width="14" height="14" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

interface AssistantPromptProps {
  lang: Lang;
  onSend: (text: string) => void;
}

const AssistantPrompt = ({ lang, onSend }: AssistantPromptProps) => (
  <>
    {/* Une clé par langue au lieu de deux sous-arbres JSX complets : la
 ponctuation et l'espacement diffèrent entre FR et EN et vivaient dans
 le code. Le même <accent> est cloné à chaque occurrence. */}
    <div className="text-base font-normal leading-snug tracking-tight text-foreground">
      <Trans
        i18nKey="assistant.prompt"
        components={{ accent: <span className="text-primary" /> }}
      />
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
  <Button
    onClick={onClick}
    variant="outline"
    className="h-auto px-2.5 py-1.5 tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground"
  >
    {children}
  </Button>
);

interface ChatBubbleProps {
  role: string;
  content: string;
}

const isSafeHref = (href: unknown): href is string =>
  typeof href === 'string' && /^(https?:|mailto:)/i.test(href);

const assistantMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="m-0 mb-2 text-sm leading-normal last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-xs uppercase tracking-widest text-primary first:mt-0">
      {children}
    </div>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-xs uppercase tracking-widest text-primary first:mt-0">
      {children}
    </div>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-xs uppercase tracking-widest text-primary first:mt-0">
      {children}
    </div>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-1 mt-2 font-mono text-xs uppercase tracking-widest text-primary first:mt-0">
      {children}
    </div>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="m-0 mb-2 list-disc pl-4 text-sm leading-normal last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="m-0 mb-2 list-decimal pl-4 text-sm leading-normal last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-0.5 text-sm leading-normal">{children}</li>
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

const ALLOWED_MARKDOWN_ELEMENTS = [
  'p',
  'strong',
  'em',
  'a',
  'ul',
  'ol',
  'li',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
];

const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] break-words text-sm leading-normal tracking-tight',
          isUser
            ? 'dark bg-background px-3 py-2 text-foreground whitespace-pre-wrap'
            : 'bg-transparent py-1 text-foreground',
        )}
      >
        {!isUser && (
          <div className="mb-0.5 font-mono text-xs uppercase tracking-widest text-primary">
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
      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
        E-DO
      </div>
      <div className="flex h-3.5 items-center gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="animate-pulse h-1 w-1 rounded-full bg-foreground"
          />
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

const AssistantInput = ({
  input,
  setInput,
  loading,
  lang,
  onSend,
  inputRef,
}: AssistantInputProps) => {
  const t = useT();
  return (
    <form
      name="assistant-chat"
      aria-label="Assistant chat"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(input);
      }}
      className="mt-auto flex shrink-0 items-center gap-2.5 border-t border-border pt-2.5"
    >
      <Input
        ref={inputRef}
        name="message"
        value={input}
        onChange={(event) =>
          setInput(event.target.value.slice(0, MAX_INPUT_CHARS))
        }
        disabled={loading}
        maxLength={MAX_INPUT_CHARS}
        placeholder={t('assistant.placeholder')}
        className="h-auto flex-1 rounded-none  bg-transparent font-sans text-sm caret-primary disabled:bg-transparent"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={loading || !input.trim()}
        aria-label={t('common.send')}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowRight />
      </Button>
    </form>
  );
};

const MONTHS_SHORT: Record<Lang, string[]> = {
  fr: [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ],
  en: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
};

const fmtRecapDate = (
  d: { y: number; m: number; d: number } | null,
  lang: Lang,
) => (d ? `${d.d} ${MONTHS_SHORT[lang][d.m]} ${d.y}` : '—');

interface ContactFormProps {
  lang: Lang;
  onSubmit: (message: string) => void;
}

const ContactForm = ({ lang, onSubmit }: ContactFormProps) => {
  const t = useT();
  const [f, setF] = useState({
    prenom: '',
    nom: '',
    email: '',
    tel: '',
    societe: '',
    adresseFacturation: '',
    marque: '',
    siren: '',
    autresInfos: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mêmes règles que le tunnel de réservation : la regex email en ligne et
    // les contrôles de présence vivaient ici en double.
    const check = validateIdentity(f, lang);
    if (!check.success) {
      const firstError = Object.values(check.errors)[0];
      setErr(firstError ?? t('assistant.contactErrRequired'));
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
    if (f.autresInfos.trim())
      parts.push(`Autres infos: ${f.autresInfos.trim()}`);
    onSubmit('Mes coordonnées — ' + parts.join(' · '));
  };

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border border-border bg-background p-3"
    >
      <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
        {t('assistant.contactFormTitle')}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Input
            placeholder={t('assistant.contactFirstName')}
            value={f.prenom}
            onChange={upd('prenom')}
          />
          <Input
            placeholder={t('assistant.contactLastName')}
            value={f.nom}
            onChange={upd('nom')}
          />
        </div>
        <Input
          type="email"
          placeholder={t('assistant.contactEmail')}
          value={f.email}
          onChange={upd('email')}
        />
        <Input
          type="tel"
          placeholder={t('assistant.contactPhone')}
          value={f.tel}
          onChange={upd('tel')}
        />
        <Input
          placeholder={t('assistant.contactCompany')}
          value={f.societe}
          onChange={upd('societe')}
        />
        <Input
          placeholder={t('assistant.contactBillingAddress')}
          value={f.adresseFacturation}
          onChange={upd('adresseFacturation')}
        />
        <Input
          placeholder={t('assistant.contactBrand')}
          value={f.marque}
          onChange={upd('marque')}
        />
        <Input
          placeholder={t('assistant.contactSiren')}
          value={f.siren}
          onChange={upd('siren')}
        />
        <Input
          placeholder={t('assistant.contactNotes')}
          value={f.autresInfos}
          onChange={upd('autresInfos')}
        />
      </div>
      {err && <div className="mt-1.5 text-xs text-primary">{err}</div>}
      <Button
        type="submit"
        className="mt-2 h-auto w-full px-3 py-2 text-sm normal-case tracking-normal"
      >
        {t('assistant.contactSubmit')}
      </Button>
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

const BookingRecapCard = ({
  proposal,
  lang,
  cgv,
  setCgv,
  busy,
  error,
  onConfirm,
}: BookingRecapCardProps) => {
  const t = useT();
  const ttc = Math.round(proposal.quote.total * 1.2);
  return (
    <div className="shrink-0 border border-border bg-background p-3">
      <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
        {t('assistant.bookingRecapTitle')}
      </div>

      <div className="mb-2 flex flex-col gap-1">
        {proposal.sessions.map((s) => {
          const px = BOOK_PLATEAUX.find((p) => p.k === s.plateauKey);
          return (
            <div
              key={`${s.plateauKey}-${s.date}-${s.arrivalHour ?? ''}`}
              className="flex justify-between gap-2 text-sm"
            >
              <span className="text-foreground">
                {px ? px[lang] : s.plateauKey} · {fmtRecapDate(s.date, lang)}
                {s.arrivalHour != null ? ` · ${s.arrivalHour}h` : ''}
              </span>
              <span className="text-muted-foreground">{s.hours}h</span>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex flex-col gap-0.5 border-t border-border pt-2">
        {proposal.quote.rows.map((r) => (
          <div key={r.lbl} className="flex justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{r.lbl}</span>
            <span className="text-foreground">
              {r.onReq ? '—' : `${fmtEUR(r.amt, lang)} €`}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
        <span>{t('assistant.bookingTotalHT')}</span>
        <span>{fmtEUR(proposal.quote.total, lang)} €</span>
      </div>
      <div className="mb-2 text-right font-mono text-xs text-muted-foreground">
        {fmtEUR(ttc, lang)} € {t('assistant.bookingTotalTTC')}
      </div>

      <div className="mb-2 border-t border-border pt-2 text-xs text-muted-foreground">
        {t('assistant.bookingContact')}: {proposal.contact.prenom}{' '}
        {proposal.contact.nom} · {proposal.contact.email} ·{' '}
        {proposal.contact.tel}
        {proposal.contact.siren ? ` · SIREN ${proposal.contact.siren}` : ''}
      </div>

      <div className="mb-2 text-xs italic text-muted-foreground">
        {t('assistant.bookingEstimateNote')}
      </div>

      <label className="mb-2 flex cursor-pointer items-start gap-2 text-xs text-foreground">
        <Checkbox
          checked={cgv}
          onCheckedChange={(next: boolean) => setCgv(next)}
          className="mt-0.5"
        />
        <span>{t('assistant.bookingCgv')}</span>
      </label>

      {error && <div className="mb-2 text-xs text-primary">{error}</div>}

      <Button
        type="button"
        disabled={!cgv || busy}
        onClick={onConfirm}
        className="h-auto w-full px-3 py-2 text-sm normal-case tracking-normal"
      >
        {busy
          ? t('assistant.bookingConfirming')
          : t('assistant.bookingConfirm')}
      </Button>
    </div>
  );
};

interface AssistantChatProps {
  lang: Lang;
  badge?: number | string;
  className?: string;
}

const AssistantChat = ({ lang, badge, className = '' }: AssistantChatProps) => {
  const t = useT();
  const {
    sessions,
    activeId,
    activeMessages: messages,
    setActiveMessages,
    newSession,
    selectSession,
    deleteSession,
  } = useChatSessions();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [proposal, setProposal] = useState<CreateBookingInput | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [collectContact, setCollectContact] = useState(false);
  const [cgv, setCgv] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPath = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? '',
  });

  const mode: 'prompt' | 'chat' = messages.length === 0 ? 'prompt' : 'chat';
  const savedSessions = sessions.filter((s) => s.messages.length > 0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = (text || '').trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setActiveMessages(nextMessages);
    setInput('');
    setLoading(true);
    setSuggestions([]);
    setCollectContact(false);

    try {
      const result = await sendAssistantMessage(
        nextMessages,
        lang,
        sanitizeCurrentPage(currentPath),
      );
      if ('reply' in result) {
        setActiveMessages([
          ...nextMessages,
          { role: 'assistant', content: result.reply },
        ]);
        setSuggestions(result.suggestions ?? []);
        setCollectContact(result.collectContact ?? false);
        if (result.bookingProposal) {
          setProposal(result.bookingProposal);
          setCgv(false);
          setBookingErr(null);
        }
      } else {
        const fallback =
          result.error === 'rate_limited'
            ? t('assistant.rateLimited')
            : t('assistant.errorFallback');
        setActiveMessages([
          ...nextMessages,
          { role: 'assistant', content: fallback },
        ]);
      }
    } catch (_error) {
      setActiveMessages([
        ...nextMessages,
        { role: 'assistant', content: t('assistant.errorFallback') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearBookingState = () => {
    setProposal(null);
    setSuggestions([]);
    setCollectContact(false);
    setCgv(false);
    setBookingErr(null);
  };

  const confirmBooking = async () => {
    if (!proposal || !cgv || bookingBusy) return;
    setBookingBusy(true);
    setBookingErr(null);
    try {
      const result = await createBooking({ ...proposal, mode: 'booking' });
      setProposal(null);
      setCgv(false);
      setActiveMessages([
        ...messages,
        {
          role: 'assistant',
          content: t('assistant.bookingSuccess', { ref: result.reference }),
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const isConflict =
        msg.includes('réservé') || msg.includes('already booked');
      setBookingErr(
        isConflict
          ? t('assistant.bookingConflict')
          : t('assistant.bookingError'),
      );
    } finally {
      setBookingBusy(false);
    }
  };

  const startNewSession = () => {
    newSession();
    setInput('');
    setHistoryOpen(false);
    clearBookingState();
  };

  return (
    <div
      className={cn(
        ' group relative flex h-full w-full flex-col gap-2.5 overflow-hidden bg-background px-4.5 pb-3 pt-3.5',
        className || 'col-start-10 col-end-13 row-start-4 row-end-6 min-h-0',
      )}
    >
      {badge != null && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-30 rounded-sm bg-primary px-2 py-1 font-mono text-xs font-semibold tracking-widest text-primary-foreground shadow-md">
          #{badge}
        </span>
      )}

      <AssistantHeader
        lang={lang}
        mode={mode}
        loading={loading}
        historyCount={savedSessions.length}
        onNewSession={startNewSession}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {mode === 'prompt' ? (
        <AssistantPrompt lang={lang} onSend={send} />
      ) : (
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-thin"
        >
          {messages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}`}
              role={message.role}
              content={message.content}
            />
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

      {historyOpen && (
        <ChatSessionList
          lang={lang}
          sessions={savedSessions}
          activeId={activeId}
          onSelect={(id) => {
            selectSession(id);
            setInput('');
            setHistoryOpen(false);
            clearBookingState();
          }}
          onDelete={deleteSession}
          onNew={startNewSession}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
};

export { AssistantChat };
export default AssistantChat;
