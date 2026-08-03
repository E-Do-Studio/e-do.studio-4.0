import { useState } from 'react';
import type { FormEvent, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { ContactFormData, Lang } from './types';
import { submitContactForm } from './lib/contact';
import { common, contact as contactMsg } from './i18n/messages';
import { Button } from './ui/button';
import { cn } from './ui/cn';
import { IconArrowRight } from './ui/icons';

export const INITIAL_FORM: ContactFormData = {
  nom: '',
  email: '',
  telephone: '',
  societe: '',
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

interface ContactFormProps {
  lang: Lang;
  form: ContactFormData;
  setForm: (form: ContactFormData) => void;
  submit: (event: FormEvent) => void;
  sending: boolean;
  sendError: string | null;
}

export const ContactForm = ({
  lang,
  form,
  setForm,
  submit,
  sending,
  sendError,
}: ContactFormProps) => {
  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-2 grid-rows-contact-form-compact gap-hairline bg-edo-pure-black md:h-full"
    >
      <div className="col-span-2 flex flex-col justify-center bg-white px-5 py-2.5">
        <span className="edo-cell-label text-primary">{contactMsg.writeToUs[lang]}</span>
        <h1 className="m-0 mt-0.5 text-tile-large font-light leading-none tracking-display text-foreground">
          {contactMsg.projectVisit[lang]}
        </h1>
      </div>

      <ContactInput
        required
        value={form.nom}
        onChange={(value) => setForm({ ...form, nom: value })}
        placeholder={contactMsg.name[lang]}
        className="col-start-1 row-start-2"
      />
      <ContactInput
        required
        type="tel"
        value={form.telephone}
        onChange={(value) => setForm({ ...form, telephone: value })}
        placeholder={contactMsg.phonePlaceholder[lang]}
        className="col-start-2 row-start-2"
      />
      <ContactInput
        required
        type="email"
        value={form.email}
        onChange={(value) => setForm({ ...form, email: value })}
        placeholder="Email*"
        className="col-span-2 row-start-3"
      />
      <ContactInput
        required
        value={form.societe}
        onChange={(value) => setForm({ ...form, societe: value })}
        placeholder={contactMsg.companyBrand[lang]}
        className="col-span-2 row-start-4"
      />
      <ContactTextarea
        required
        value={form.message}
        onChange={(value) => setForm({ ...form, message: value })}
        placeholder={contactMsg.yourMessage[lang]}
        className="row-start-5"
      />

      {sendError && (
        <div className="col-span-2 flex items-center bg-red-50 px-5 py-2 text-sm text-red-600">
          {sendError}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="edo-focus-ring col-span-2 row-start-6 flex cursor-pointer items-center justify-center gap-3.5 border-0 bg-primary font-mono text-caption uppercase tracking-label text-white transition-[color,background-color,opacity] duration-150 ease-edo-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
  onClose?: () => void;
  continueLabel?: string;
  className?: string;
}

export const EmbeddedContactForm = ({
  lang,
  onClose,
  continueLabel,
  className,
}: EmbeddedContactFormProps) => {
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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
        />
      ) : (
        <ContactSuccess
          lang={lang}
          onNewMessage={() => {
            setSent(false);
            setForm(INITIAL_FORM);
          }}
          onContinue={onClose}
          continueLabel={continueLabel}
        />
      )}
    </div>
  );
};
