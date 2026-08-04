import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ContactFormData, Lang } from './types';
import { submitContactForm } from './lib/contact';
import { useT } from './i18n/use-t';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export const INITIAL_FORM: ContactFormData = {
  nom: '',
  email: '',
  telephone: '',
  societe: '',
  message: '',
};

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
  const t = useT();
  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-2 grid-rows-contact-form-compact gap-hairline bg-edo-pure-black md:h-full"
    >
      <div className="col-span-2 flex flex-col justify-center bg-background px-5 py-2.5">
        <span className="edo-cell-label text-primary">
          {t('contact.writeToUs')}
        </span>
        <h1 className="m-0 mt-0.5 text-tile-large font-light leading-none tracking-display text-foreground">
          {t('contact.projectVisit')}
        </h1>
      </div>

      <Input
        variant="bento"
        required
        value={form.nom}
        onChange={(e) => setForm({ ...form, nom: e.target.value })}
        placeholder={t('contact.name')}
        className="col-start-1 row-start-2"
      />
      <Input
        variant="bento"
        required
        type="tel"
        value={form.telephone}
        onChange={(e) => setForm({ ...form, telephone: e.target.value })}
        placeholder={t('contact.phonePlaceholder')}
        className="col-start-2 row-start-2"
      />
      <Input
        variant="bento"
        required
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="Email*"
        className="col-span-2 row-start-3"
      />
      <Input
        variant="bento"
        required
        value={form.societe}
        onChange={(e) => setForm({ ...form, societe: e.target.value })}
        placeholder={t('contact.companyBrand')}
        className="col-span-2 row-start-4"
      />
      <Textarea
        variant="bento"
        required
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        placeholder={t('contact.yourMessage')}
        className="col-span-2 row-start-5 min-h-36"
      />

      {sendError && (
        <Alert variant="destructive" className="col-span-2 rounded-none">
          <AlertDescription>{sendError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={sending}
        className="col-span-2 row-start-6 h-full gap-3.5"
      >
        {sending ? (
          t('common.sending')
        ) : (
          <>
            {t('common.send')} <ArrowRight data-icon="inline-end" />
          </>
        )}
      </Button>
    </form>
  );
};

interface ContactSuccessProps {
  onNewMessage: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export const ContactSuccess = ({
  onNewMessage,
  onContinue,
  continueLabel,
}: ContactSuccessProps) => {
  const t = useT();
  return (
    <div className="flex h-full flex-col items-start justify-center gap-4 bg-background px-7 py-8">
      <span className="edo-cell-label text-primary">
        ✓ {t('contact.messageSent')}
      </span>
      <h1 className="m-0 max-w-lg text-page-title font-light leading-tight tracking-display text-foreground">
        {t('contact.thanksSoon')}
      </h1>
      <p className="m-0 max-w-md text-detail leading-normal text-muted-foreground">
        {t('contact.replyTime')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Button variant="outline" size="lg" onClick={onNewMessage}>
          {t('contact.newMessage')}
        </Button>
        {onContinue && (
          <Button size="lg" onClick={onContinue}>
            {continueLabel ?? `${t('common.backToGallery')} →`}
          </Button>
        )}
      </div>
    </div>
  );
};

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
  const t = useT();
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
      setSendError(err instanceof Error ? err.message : t('contact.errorSend'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn('bg-background md:h-full', className)}>
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
