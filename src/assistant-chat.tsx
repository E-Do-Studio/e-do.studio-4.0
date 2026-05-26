import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { IconArrowRight, cn } from './ui';
import type { Lang, ChatMessage } from './types';
import { assistant as assistantMsg } from './i18n/messages';
import { supabase } from './lib/supabase';

const MAX_INPUT_CHARS = 1500;

const getQuickReplies = (lang: Lang) => lang === 'fr'
  ? ['Tarifs cyclo', 'Dispos semaine prochaine', 'Livraison post-prod', 'Visite studio']
  : ['Cyclo rates', 'Next-week availability', 'Post-prod delivery', 'Studio tour'];

type ChatError = 'rate_limited' | 'other';

interface ChatResponse {
  reply?: string;
  error?: string;
}

const sendAssistantMessage = async (
  messages: ChatMessage[],
  lang: Lang,
): Promise<{ reply: string } | { error: ChatError }> => {
  const { data, error } = await supabase.functions.invoke<ChatResponse>('chat', {
    body: { messages, lang },
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
  return { reply: data.reply };
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

const isSafeHref = (href: unknown): href is string =>
  typeof href === 'string' && /^(https?:|mailto:)/i.test(href);

const assistantMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="m-0 mb-1.5 text-detail leading-normal last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="m-0 mb-1.5 list-disc pl-4 text-detail leading-normal last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="m-0 mb-1.5 list-decimal pl-4 text-detail leading-normal last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-0.5 text-detail leading-normal">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (!isSafeHref(href)) return <>{children}</>;
    const isMail = href.toLowerCase().startsWith('mailto:');
    return (
      <a
        href={href}
        target={isMail ? '_self' : '_blank'}
        rel={isMail ? undefined : 'noopener noreferrer'}
        className="underline underline-offset-2 hover:text-primary"
      >
        {children}
      </a>
    );
  },
};

const ALLOWED_MARKDOWN_ELEMENTS = ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br'];

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
    onSubmit={(event) => {
      event.preventDefault();
      onSend(input);
    }}
    className="mt-auto flex shrink-0 items-center gap-2.5 border-t border-foreground pt-2.5"
  >
    <input
      ref={inputRef}
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
      className="edo-focus-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted-foreground"
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
    const trimmed = (text || '').trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setMode('chat');
    setLoading(true);

    try {
      const result = await sendAssistantMessage(nextMessages, lang);
      if ('reply' in result) {
        setMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: result.reply }]);
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
