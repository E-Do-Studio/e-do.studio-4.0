import { useEffect, useRef, useState } from 'react';
import type { FormEvent, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { ContactFormData, Lang } from './types';
import type { ContactSubject } from './lib/strapi';
import { useContactSubjects } from './lib/use-strapi';
import { submitContactForm } from './lib/contact';
import { common, contact as contactMsg } from './i18n/messages';
import { Button, IconArrowRight, cn } from './ui';

export const INITIAL_FORM: ContactFormData = {
  nom: '',
  email: '',
  telephone: '',
  societe: '',
  sujet: 'general',
  message: '',
};

const inputClassName =
  'edo-bento-input w-full border-0 bg-white px-5 font-sans text-cell font-light tracking-copy-tight text-foreground outline-none transition-colors focus:bg-muted';

interface ContactInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const ContactInput = ({ value, onChange, className, type = 'text', ...props }: ContactInputProps) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={cn(inputClassName, className)}
    {...props}
  />
);

interface ContactTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const ContactTextarea = ({ value, onChange, className, ...props }: ContactTextareaProps) => (
  <textarea
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={cn(inputClassName, 'col-span-2 h-full min-h-36 resize-none py-4 leading-normal', className)}
    {...props}
  />
);

interface SubjectButtonProps {
  subject: ContactSubject;
  index: number;
  lang: Lang;
  active: boolean;
  onClick: () => void;
}

export const SubjectButton = ({ subject, index, lang, active, onClick }: SubjectButtonProps) => {
  const placements = [
    'col-start-1 row-start-2',
    'col-start-2 row-start-2',
    'col-start-1 row-start-3',
    'col-start-2 row-start-3',
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        placements[index],
        'edo-focus-ring flex min-h-14 cursor-pointer items-center gap-3 border-0 px-5 py-2.5 text-left font-sans transition-colors',
        active ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted',
      )}
    >
      <span className={cn('font-mono text-caption tracking-meta', active ? 'text-white/60' : 'text-muted-foreground')}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="text-detail font-normal tracking-copy-tight">{subject[lang]}</span>
    </button>
  );
};

interface ContactFormProps {
  lang: Lang;
  form: ContactFormData;
  setForm: (form: ContactFormData) => void;
  submit: (event: FormEvent) => void;
  sending: boolean;
  sendError: string | null;
  subjects: ContactSubject[];
  hideSubjectButtons?: boolean;
}

export const ContactForm = ({
  lang,
  form,
  setForm,
  submit,
  sending,
  sendError,
  subjects,
  hideSubjectButtons,
}: ContactFormProps) => {
  const compact = !!hideSubjectButtons;
  const rowsClass = compact ? 'grid-rows-contact-form-compact' : 'grid-rows-contact-form';
  const nomTelRow = compact ? 'row-start-2' : 'row-start-4';
  const emailRow = compact ? 'row-start-3' : 'row-start-5';
  const societeRow = compact ? 'row-start-4' : 'row-start-6';
  const messageRow = compact ? 'row-start-5' : 'row-start-7';
  const submitRow = compact ? 'row-start-6' : 'row-start-8';

  return (
    <form
      onSubmit={submit}
      className={cn('grid grid-cols-2 gap-hairline bg-border md:h-full', rowsClass)}
    >
      <div className="col-span-2 flex flex-col justify-center bg-white px-5 py-2.5">
        <span className="edo-cell-label text-primary">{contactMsg.writeToUs[lang]}</span>
        <h1 className="m-0 mt-0.5 text-tile-large font-light leading-none tracking-display text-foreground">
          {contactMsg.projectVisit[lang]}
        </h1>
      </div>

      {!compact &&
        subjects.slice(0, 4).map((subject, index) => (
          <SubjectButton
            key={subject.k}
            subject={subject}
            index={index}
            lang={lang}
            active={form.sujet === subject.k}
            onClick={() => setForm({ ...form, sujet: subject.k })}
          />
        ))}

      <ContactInput
        required
        value={form.nom}
        onChange={(value) => setForm({ ...form, nom: value })}
        placeholder={contactMsg.name[lang]}
        className={cn('col-start-1', nomTelRow)}
      />
      <ContactInput
        required
        type="tel"
        value={form.telephone}
        onChange={(value) => setForm({ ...form, telephone: value })}
        placeholder={contactMsg.phonePlaceholder[lang]}
        className={cn('col-start-2', nomTelRow)}
      />
      <ContactInput
        required
        type="email"
        value={form.email}
        onChange={(value) => setForm({ ...form, email: value })}
        placeholder="Email*"
        className={cn('col-span-2', emailRow)}
      />
      <ContactInput
        required
        value={form.societe}
        onChange={(value) => setForm({ ...form, societe: value })}
        placeholder={contactMsg.companyBrand[lang]}
        className={cn('col-span-2', societeRow)}
      />
      <ContactTextarea
        required
        value={form.message}
        onChange={(value) => setForm({ ...form, message: value })}
        placeholder={contactMsg.yourMessage[lang]}
        className={messageRow}
      />

      {sendError && (
        <div className="col-span-2 flex items-center bg-red-50 px-5 py-2 text-sm text-red-600">
          {sendError}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className={cn(
          'edo-focus-ring col-span-2 flex cursor-pointer items-center justify-center gap-3.5 border-0 bg-primary font-mono text-caption uppercase tracking-label text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
          submitRow,
        )}
      >
        {sending ? (
          common.sending[lang]
        ) : (
          <>
            {common.send[lang]} <IconArrowRight width="16" height="16" />
          </>
        )}
      </button>
    </form>
  );
};

interface ContactSuccessProps {
  lang: Lang;
  onNewMessage: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export const ContactSuccess = ({ lang, onNewMessage, onContinue, continueLabel }: ContactSuccessProps) => (
  <div className="flex h-full flex-col items-start justify-center gap-4 bg-white px-7 py-8">
    <span className="edo-cell-label text-primary">✓ {contactMsg.messageSent[lang]}</span>
    <h1 className="m-0 max-w-lg text-page-title font-light leading-tight tracking-display text-foreground">
      {contactMsg.thanksSoon[lang]}
    </h1>
    <p className="m-0 max-w-md text-detail leading-normal text-muted-foreground">
      {contactMsg.replyTime[lang]}
    </p>
    <div className="mt-3 flex flex-wrap gap-2.5">
      <Button variant="outline" size="lg" onClick={onNewMessage}>
        {contactMsg.newMessage[lang]}
      </Button>
      {onContinue && (
        <Button size="lg" onClick={onContinue}>
          {continueLabel ?? `${common.backToGallery[lang]} →`}
        </Button>
      )}
    </div>
  </div>
);

interface EmbeddedContactFormProps {
  lang: Lang;
  defaultSubjectKey?: string;
  hideSubjectButtons?: boolean;
  onClose?: () => void;
  continueLabel?: string;
  className?: string;
}

export const EmbeddedContactForm = ({
  lang,
  defaultSubjectKey,
  hideSubjectButtons,
  onClose,
  continueLabel,
  className,
}: EmbeddedContactFormProps) => {
  const subjectsState = useContactSubjects();
  const subjects = subjectsState.data ?? [];
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const appliedDefaultRef = useRef(false);

  useEffect(() => {
    if (appliedDefaultRef.current) return;
    if (!defaultSubjectKey) return;
    if (subjects.length === 0) return;
    const exact = subjects.find((s) => s.k === defaultSubjectKey);
    const fuzzy = exact ?? subjects.find((s) => /reserv|booking/i.test(s.k));
    if (fuzzy) {
      setForm((f) => ({ ...f, sujet: fuzzy.k }));
      appliedDefaultRef.current = true;
    }
  }, [defaultSubjectKey, subjects]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setSendError(null);
    try {
      await submitContactForm(form);
      setSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : contactMsg.errorSend[lang]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn('bg-white md:h-full', className)}>
      {!sent ? (
        <ContactForm
          lang={lang}
          form={form}
          setForm={setForm}
          submit={submit}
          sending={sending}
          sendError={sendError}
          subjects={subjects}
          hideSubjectButtons={hideSubjectButtons}
        />
      ) : (
        <ContactSuccess
          lang={lang}
          onNewMessage={() => {
            setSent(false);
            setForm({ ...INITIAL_FORM, sujet: form.sujet });
          }}
          onContinue={onClose}
          continueLabel={continueLabel}
        />
      )}
    </div>
  );
};
