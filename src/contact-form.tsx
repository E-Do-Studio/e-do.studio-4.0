import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ContactFormData, Lang } from './types';
import { submitContactForm } from './lib/contact';
import { useT } from './i18n/use-t';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FormCell, FormCellInput, FormCellTextarea } from './ui/form-cell';
import { SectionIntro } from './ui/section-intro';
import { StatusBadge } from './ui/status-badge';
import { CtaCell } from './ui/cta-cell';

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
      // Le rythme de la colonne vient des tokens : le rail de contact, à côté,
      // aligne ses coutures sur le même module. Les deux mesures étaient écrites
      // en littéraux ici ET dans le rail, donc elles dérivaient séparément.
      //
      // Le PIED est la seule piste qui change de valeur selon le palier, d'où la
      // variable : au-dessus de `app` les deux colonnes sont côte à côte, et le
      // rail s'y ferme sur DEUX cellules — le pavé d'itinéraire et la bande
      // sociale, plus leur couture. Le pavé d'envoi leur fait face d'un seul
      // tenant, sinon sa couture haute tombe au milieu du pied voisin. Sous le
      // palier les colonnes sont empilées : il n'y a plus de voisin, le pavé
      // revient à une bande.
      className="grid grid-cols-2 grid-rows-[var(--spacing-col-head)_repeat(3,var(--spacing-col-row))_minmax(0,1fr)_var(--form-foot)] gap-px bg-border [--form-foot:var(--spacing-band)] app:h-full app:[--form-foot:calc(2*var(--spacing-band)+1px)]"
    >
      {/* `<h2>` et non `<h1>` : la page porte déjà le sien (contact-page).
          Le formulaire est aussi embarqué dans la galerie et le tunnel, où
          un second `<h1>` doublonnait à chaque fois.

          Plus de sur-titre : « Écrivez-nous » ne disait rien que « Un projet,
          une visite ? » ne dise déjà, et le `h1` de la page étant `sr-only`,
          ce titre EST celui de l'écran — au registre `flow`, un cran au-dessus
          des cellules du rail (`HeadlineCell`, « titre de cellule »), il porte
          enfin la hiérarchie que le mono orange simulait.

          `px-4 sm:px-3` est la paire de `FormCell` : le titre démarre sur la
          verticale des libellés de champ qu'il coiffe, pas 8px à leur droite. */}
      <SectionIntro
        size="flow"
        as="h2"
        title={t('contact.projectVisit')}
        className="col-span-2 justify-center bg-background px-4 py-2.5 sm:px-3"
      />

      <FormCell
        label={t('contact.name')}
        className="col-start-1 row-start-2 justify-center"
      >
        <FormCellInput
          name="nom"
          autoComplete="name"
          placeholder={t('contact.placeholderName')}
          value={form.nom}
          onChange={(nom) => setForm({ ...form, nom })}
        />
      </FormCell>
      <FormCell
        label={t('contact.phonePlaceholder')}
        className="col-start-2 row-start-2 justify-center"
      >
        <FormCellInput
          type="tel"
          name="telephone"
          autoComplete="tel"
          inputMode="tel"
          placeholder={t('contact.placeholderPhone')}
          value={form.telephone}
          onChange={(telephone) => setForm({ ...form, telephone })}
        />
      </FormCell>
      <FormCell
        label="Email*"
        className="col-span-2 row-start-3 justify-center"
      >
        <FormCellInput
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('contact.placeholderEmail')}
          value={form.email}
          onChange={(email) => setForm({ ...form, email })}
        />
      </FormCell>
      <FormCell
        label={t('contact.companyBrand')}
        className="col-span-2 row-start-4 justify-center"
      >
        <FormCellInput
          name="societe"
          autoComplete="organization"
          placeholder={t('contact.placeholderCompany')}
          value={form.societe}
          onChange={(societe) => setForm({ ...form, societe })}
        />
      </FormCell>
      <FormCell
        label={t('contact.yourMessage')}
        className="col-span-2 row-start-5 justify-start"
      >
        <FormCellTextarea
          name="message"
          placeholder={t('contact.placeholderMessage')}
          value={form.message}
          onChange={(message) => setForm({ ...form, message })}
          fill
        />
      </FormCell>

      {sendError && (
        <Alert variant="destructive" className="col-span-2 rounded-none">
          <AlertDescription>{sendError}</AlertDescription>
        </Alert>
      )}

      <CtaCell
        type="submit"
        disabled={sending}
        title={sending ? t('common.sending') : t('common.send')}
        className="col-span-2 row-start-6"
      />
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
    // Le sur-titre reste ici, mais en pastille : il porte un ÉTAT, pas une
    // catégorie décorative — et `<output>` l'annonce comme tel. C'est la forme
    // que la confirmation de réservation lui donne déjà (`book-confirmation`).
    // Le `✓` en préfixe disparaît : l'aplat orange est la marque.
    <SectionIntro
      size="flow"
      as="h2"
      kicker={
        <StatusBadge render={<output />} size="md" className="self-start">
          {t('contact.messageSent')}
        </StatusBadge>
      }
      title={t('contact.thanksSoon')}
      subtitle={t('contact.replyTime')}
      className="h-full items-start justify-center bg-background px-7 py-8"
    >
      <Button variant="outline" size="lg" onClick={onNewMessage}>
        {t('contact.newMessage')}
      </Button>
      {onContinue && (
        <Button size="lg" onClick={onContinue}>
          {continueLabel ?? `${t('common.backToGallery')} →`}
        </Button>
      )}
    </SectionIntro>
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
    <div className={cn('bg-background app:h-full', className)}>
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
