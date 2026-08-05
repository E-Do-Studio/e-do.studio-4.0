import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';
import { useT } from '../../i18n/use-t';
import type { BookPlateau, Lang } from '../../lib/booking-engine';
import type { ContactFormErrors } from '../../lib/booking-schema';
import type { ContactState } from '../booking-types';
import { ARTICLE_TYPES, catLabel } from '../catalog';
import { BentoField, BentoInput } from '../shared';

interface StepContactProps {
  lang: Lang;
  contact: ContactState;
  setContact: (next: ContactState) => void;
  plateau: BookPlateau;
  /** Le configurateur a déjà collecté produits et quantités. */
  configMode: boolean;
  errors?: ContactFormErrors;
}

const LABEL_CLS =
  'font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground';

/** Cellule bento large, hors du `Field` de shadcn (contenu non-input). */
const WideCell = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) => (
  <div
    className={cn(
      'bg-background px-3 py-1.5 col-span-1 sm:col-span-2 flex flex-col gap-1 min-h-11',
      error && 'ring-1 ring-inset ring-destructive',
    )}
  >
    <span className={LABEL_CLS}>{label}</span>
    {children}
    {error && (
      <span className="text-destructive text-xs leading-tight">{error}</span>
    )}
  </div>
);

const StepContact = ({
  lang,
  contact,
  setContact,
  plateau,
  configMode,
  errors = {},
}: StepContactProps) => {
  const t = useT();
  const patch = (fields: Partial<ContactState>) =>
    setContact({ ...contact, ...fields });
  const showProductFields = !plateau.isCyclo && !configMode;

  const toggleType = (k: string) => {
    const cur = contact.typesArticles || [];
    patch({
      typesArticles: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k],
    });
  };

  return (
    <div>
      <div className="px-5 md:px-6 border-b border-border flex items-center min-h-11 py-3 md:py-0 md:h-11 box-border gap-3 bg-background flex-wrap sticky top-0 z-10">
        <span className="font-mono text-xs font-normal uppercase tracking-widest text-primary whitespace-nowrap">
          05 · {t('assistant.contactFormTitle')}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
        <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
          <BentoField label={t('booking.brand')}>
            <BentoInput
              name="brand"
              value={contact.marque}
              onChange={(v) => patch({ marque: v })}
              placeholder="—"
            />
          </BentoField>
          <BentoField label={t('booking.company2')} error={errors.societe}>
            <BentoInput
              name="company"
              autoComplete="organization"
              value={contact.societe}
              onChange={(v) => patch({ societe: v })}
              placeholder="—"
            />
          </BentoField>
          <BentoField label="SIREN *" error={errors.siren}>
            <BentoInput
              name="siren"
              inputMode="numeric"
              value={contact.siren}
              onChange={(v) => patch({ siren: v })}
              placeholder="—"
            />
          </BentoField>
        </div>
        <BentoField
          label={t('booking.billingAddress')}
          span="1 / -1"
          error={errors.adresseFacturation}
        >
          <BentoInput
            name="address"
            autoComplete="street-address"
            value={contact.adresseFacturation}
            onChange={(v) => patch({ adresseFacturation: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label={t('booking.lastName')} error={errors.nom}>
          <BentoInput
            name="lastname"
            autoComplete="family-name"
            value={contact.nom}
            onChange={(v) => patch({ nom: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label={t('booking.firstName')} error={errors.prenom}>
          <BentoInput
            name="firstname"
            autoComplete="given-name"
            value={contact.prenom}
            onChange={(v) => patch({ prenom: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label="Email *" error={errors.email}>
          <BentoInput
            name="email"
            autoComplete="email"
            value={contact.email}
            type="email"
            onChange={(v) => patch({ email: v })}
            placeholder="—"
          />
        </BentoField>
        <BentoField label={t('booking.phone')} error={errors.tel}>
          <BentoInput
            name="phone"
            autoComplete="tel"
            value={contact.tel}
            type="tel"
            onChange={(v) => patch({ tel: v })}
            placeholder="—"
          />
        </BentoField>
        {showProductFields && (
          <>
            <WideCell
              label={t('booking.itemTypes')}
              error={errors.typesArticles}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                {ARTICLE_TYPES.map((type) => {
                  const on = (contact.typesArticles || []).includes(type.k);
                  return (
                    <Button
                      type="button"
                      key={type.k}
                      onClick={() => toggleType(type.k)}
                      variant="outline"
                      aria-pressed={on}
                      className={cn(
                        'h-auto min-w-0 justify-start gap-1 px-2 py-1 text-xs normal-case tracking-tight',
                        on && 'dark border-foreground bg-background',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'w-2 h-2 border inline-flex items-center justify-center shrink-0',
                          on
                            ? 'border-white bg-primary'
                            : 'border-muted-foreground bg-transparent',
                        )}
                      >
                        {on && <span className="w-0.5 h-0.5 bg-background" />}
                      </span>
                      <span className="overflow-hidden text-ellipsis">
                        {catLabel(t, type)}
                      </span>
                    </Button>
                  );
                })}
              </div>
              {(contact.typesArticles || []).includes('autre') && (
                <Input
                  name="other_item_type"
                  value={contact.autreType || ''}
                  onChange={(e) => patch({ autreType: e.target.value })}
                  placeholder={t('booking.specifyOtherItemType')}
                  className="mt-0.5 h-auto w-full rounded-none border-b border-b-border bg-transparent px-0 py-1 font-sans text-xs tracking-tight focus-visible:ring-0"
                />
              )}
            </WideCell>
            <BentoField
              label={t('booking.qtyItemsSkus')}
              error={errors.quantiteArticles}
            >
              <BentoInput
                name="quantity_items"
                value={contact.quantiteArticles}
                type="number"
                onChange={(v) => patch({ quantiteArticles: v })}
                placeholder="—"
              />
            </BentoField>
            <BentoField
              label={t('booking.viewsItem')}
              error={errors.vuesParArticle}
            >
              <BentoInput
                name="views_per_item"
                value={contact.vuesParArticle}
                type="number"
                onChange={(v) => patch({ vuesParArticle: v })}
                placeholder="—"
              />
            </BentoField>
          </>
        )}
        <div className="bg-background px-3 py-1.5 col-span-1 sm:col-span-2 flex flex-col gap-0.5 min-h-11">
          <span className={LABEL_CLS}>{t('booking.otherInformation')}</span>
          <Textarea
            name="message"
            value={contact.autresInfos || ''}
            onChange={(e) => patch({ autresInfos: e.target.value })}
            placeholder={t('booking.constraintsInspirationsReferencesOptional')}
            className="box-border min-h-7 w-full resize-y rounded-none bg-transparent p-0 font-sans text-xs focus-visible:ring-0"
          />
        </div>
        <label
          className={cn(
            'col-span-1 sm:col-span-2 bg-background px-3 py-1.5 flex flex-col gap-0.5 cursor-pointer min-h-11',
            errors.cgvAccepted && 'ring-1 ring-inset ring-destructive',
          )}
        >
          <span className={LABEL_CLS}>CGV *</span>
          <div className="flex items-center gap-2">
            <Checkbox
              name="cgv_accepted"
              checked={contact.cgvAccepted}
              onCheckedChange={(next: boolean) => patch({ cgvAccepted: next })}
              className="size-3.5 shrink-0"
            />
            <span className="text-xs leading-snug text-foreground">
              {/* Le lien vit dans la traduction : sa position dans la phrase
                  n'est pas la même d'une langue à l'autre. */}
              <Trans
                i18nKey="booking.cgvConsent"
                components={{
                  cgv: (
                    // biome-ignore lint/a11y/useAnchorContent: le contenu vient de la traduction
                    <a
                      href={`/${lang}/legal?doc=cgv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    />
                  ),
                }}
              />
            </span>
          </div>
          {errors.cgvAccepted && (
            <span className="text-destructive text-xs leading-tight">
              {errors.cgvAccepted}
            </span>
          )}
        </label>
      </div>
    </div>
  );
};

export { StepContact };
export type { StepContactProps };
