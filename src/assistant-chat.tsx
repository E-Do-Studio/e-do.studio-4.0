import React, { useEffect, useRef, useState } from 'react';
import { IconArrowRight, cn } from './ui';
import type { Lang, ChatMessage } from './types';

declare global {
  interface Window {
    claude?: {
      complete: (opts: { messages: Array<{ role: string; content: string }> }) => Promise<string>;
    };
  }
}

const SYSTEM_PROMPT = `Tu es l'assistant virtuel d'E-DO Studio, un studio photo/vidéo à Saint-Ouen (69 boulevard Victor Hugo, Bâtiment 6.7, Parc d'activités Victor Hugo, 93400 Saint-Ouen · M° Garibaldi L13 ou Mairie de Saint-Ouen L14).
Tu renseignes sur : tarifs (plateaux à partir de 450€/jour, cyclorama 650€/jour, post-production sur devis), disponibilités, visite du studio, services (5 plateaux, cyclorama 30m², post-production photo & vidéo, location de machines e-commerce automatisées).
Ton ton : pro, concis, chaleureux. Utilise "vous". Maximum 3-4 phrases par réponse. Propose toujours de contacter l'équipe (contact@e-do.studio · +33 1 44 04 11 49) pour un devis personnalisé ou une visite.
Réponds TOUJOURS dans la langue du dernier message de l'utilisateur (français ou anglais).`;

const getQuickReplies = (lang: Lang) => lang === 'fr'
  ? ['Tarifs cyclo', 'Dispos semaine prochaine', 'Livraison post-prod', 'Visite studio']
  : ['Cyclo rates', 'Next-week availability', 'Post-prod delivery', 'Studio tour'];

interface SendAssistantMessageOpts {
  text: string;
  messages: ChatMessage[];
}

const sendAssistantMessage = async ({ text, messages }: SendAssistantMessageOpts): Promise<string> => {
  if (!window.claude?.complete) {
    throw new Error('Claude assistant is unavailable');
  }

  return window.claude.complete({
    messages: [
      { role: 'user', content: `${SYSTEM_PROMPT}\n\n---\n\n${text}` }
    ].concat(
      messages.slice(1).map((message) => ({
        role: message.role,
        content: message.content,
      }))
    ),
  });
};

interface AssistantHeaderProps {
  lang: Lang;
  mode: 'prompt' | 'chat';
  loading: boolean;
  onReset: () => void;
}

const AssistantHeader = ({ lang, mode, loading, onReset }: AssistantHeaderProps) => (
  <div className="flex shrink-0 items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="edo-cell-label">{lang === 'fr' ? 'Assistant' : 'Assistant'}</span>
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
        {lang === 'fr' ? '↺ Reset' : '↺ Reset'}
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

interface ConversationListProps {
  messages: ChatMessage[];
  loading: boolean;
  scrollRef: React.Ref<HTMLDivElement>;
}

const ConversationList = ({ messages, loading, scrollRef }: ConversationListProps) => (
  <div
    ref={scrollRef}
    className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-thin "
  >
    {messages.map((message, index) => (
      <ChatBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
    ))}
    {loading && <TypingBubble />}
  </div>
);

interface ChatBubbleProps {
  role: string;
  content: string;
}

const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-message whitespace-pre-wrap break-words text-caption leading-normal tracking-copy-tight',
          isUser ? 'bg-foreground px-3 py-2 text-white' : 'bg-transparent py-1 text-foreground'
        )}
      >
        {!isUser && (
          <div className="mb-0.5 font-mono text-nano uppercase tracking-code text-primary">
            E-DO
          </div>
        )}
        {content}
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
    onSubmit={(event) => {
      event.preventDefault();
      onSend(input);
    }}
    className="mt-auto flex shrink-0 items-center gap-2.5 border-t border-foreground pt-2.5"
  >
    <input
      ref={inputRef}
      value={input}
      onChange={(event) => setInput(event.target.value)}
      disabled={loading}
      placeholder={lang === 'fr' ? 'Écrire votre demande…' : 'Type your request…'}
      className="edo-focus-ring min-w-0 flex-1 border-0 bg-transparent font-sans text-detail text-foreground opacity-100 placeholder:text-muted-foreground placeholder:transition-colors disabled:opacity-50 group-hover:placeholder:text-primary"
    />
    <button
      type="submit"
      disabled={loading || !input.trim()}
      className="edo-focus-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-primary opacity-100 transition-opacity disabled:cursor-default disabled:opacity-30"
    >
      <IconArrowRight width="16" height="16" />
    </button>
  </form>
);

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = (text || '').trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setMode('chat');
    setLoading(true);

    try {
      const reply = await sendAssistantMessage({ text: trimmed, messages: nextMessages });
      setMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: reply }]);
    } catch (_error) {
      setMessages((currentMessages) => [...currentMessages, {
        role: 'assistant',
        content: lang === 'fr'
          ? 'Désolé, je n\'ai pas pu traiter votre demande. Contactez-nous directement à contact@e-do.studio.'
          : 'Sorry, I couldn\'t process your request. Contact us directly at contact@e-do.studio.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setMode('prompt');
    setInput('');
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
        <ConversationList messages={messages} loading={loading} scrollRef={scrollRef} />
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
