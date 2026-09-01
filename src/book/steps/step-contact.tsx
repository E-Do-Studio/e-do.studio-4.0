import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Trans } from 'react-i18next';
import { useT } from '../../i18n/use-t';
import type { BookPlateau, Lang } from '../../lib/booking-engine';
import type { ContactFormErrors } from '../../lib/booking-schema';
import type { ContactState } from '../booking-types';
import { ARTICLE_TYPES, catLabel } from '../catalog';
import { FormCell, FormCellInput, FormCellTextarea } from '@/ui/form-cell';
import { StepHeading } from '@/ui/step-heading';
import { StepBand } from '@/ui/step-band';

interface StepContactProps {
  lang: Lang;
  contact: ContactState;
  setContact: (next: ContactState) => void;
  plateau: BookPlateau;
  /** Le configurateur a déjà collecté produits et quantités. */
  configMode: boolean;
  errors?: ContactFormErrors;
}

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
      <StepBand sticky>
        <StepHeading number="05" title={t('assistant.contactFormTitle')} />
      </StepBand>
      <div className="grid grid-cols-1 @sm:grid-cols-2 gap-px bg-border">
        <div className="col-span-1 @sm:col-span-2 grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3 gap-px bg-border">
          <FormCell label={t('booking.brand')}>
            <FormCellInput
              name="brand"
              value={contact.marque}
              onChange={(v) => patch({ marque: v })}
              placeholder={t('contact.placeholderBrand')}
            />
          </FormCell>
          <FormCell label={t('booking.company2')} error={errors.societe}>
            <FormCellInput
              name="company"
              autoComplete="organization"
              value={contact.societe}
              onChange={(v) => patch({ societe: v })}
              placeholder={t('contact.placeholderCompany')}
            />
          </FormCell>
          {/* SIREN traverse la rangée tant que la grille est à DEUX colonnes.
              Ces trois champs y laissaient une quatrième cellule vide, et la
              gouttière de ce conteneur est un fond noir : le trou se voyait
              comme un rectangle plein, pas comme du blanc.
              À trois colonnes le compte tombe juste et la cellule reprend sa
              largeur. */}
          <FormCell
            label="SIREN *"
            error={errors.siren}
            className="@md:col-span-2 @2xl:col-span-1"
          >
            <FormCellInput
              name="siren"
              inputMode="numeric"
              value={contact.siren}
              onChange={(v) => patch({ siren: v })}
              placeholder={t('contact.placeholderSiren')}
            />
          </FormCell>
        </div>
        <FormCell
          label={t('booking.billingAddress')}
          span="1 / -1"
          error={errors.adresseFacturation}
        >
          <FormCellInput
            name="address"
            autoComplete="street-address"
            value={contact.adresseFacturation}
            onChange={(v) => patch({ adresseFacturation: v })}
            placeholder={t('contact.placeholderAddress')}
          />
        </FormCell>
        <FormCell label={t('booking.lastName')} error={errors.nom}>
          <FormCellInput
            name="lastname"
            autoComplete="family-name"
            value={contact.nom}
            onChange={(v) => patch({ nom: v })}
            placeholder={t('contact.placeholderLastName')}
          />
        </FormCell>
        <FormCell label={t('booking.firstName')} error={errors.prenom}>
          <FormCellInput
            name="firstname"
            autoComplete="given-name"
            value={contact.prenom}
            onChange={(v) => patch({ prenom: v })}
            placeholder={t('contact.placeholderFirstName')}
          />
        </FormCell>
        <FormCell label="Email *" error={errors.email}>
          <FormCellInput
            name="email"
            autoComplete="email"
            value={contact.email}
            type="email"
            onChange={(v) => patch({ email: v })}
            placeholder={t('contact.placeholderEmail')}
          />
        </FormCell>
        <FormCell label={t('booking.phone')} error={errors.tel}>
          <FormCellInput
            name="phone"
            autoComplete="tel"
            value={contact.tel}
            type="tel"
            onChange={(v) => patch({ tel: v })}
            placeholder={t('contact.placeholderPhone')}
          />
        </FormCell>
        {showProductFields && (
          <>
            <FormCell
              as="group"
              label={t('booking.itemTypes')}
              error={errors.typesArticles}
              className="col-span-1 @sm:col-span-2"
            >
              <div className="grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-5 gap-1">
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
                      {/* Plus de puce dessinée. La pastille s'inverse déjà
                          quand elle est choisie — un carré de 8px qui se
                          remplit en plus, c'est un second signal pour une seule
                          information. Il portait par-dessus `border-white` sous
                          portée `dark`, là où `border-primary-foreground` est le
                          token. */}
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
            </FormCell>
            <FormCell
              label={t('booking.qtyItemsSkus')}
              error={errors.quantiteArticles}
            >
              <FormCellInput
                name="quantity_items"
                value={contact.quantiteArticles}
                type="number"
                onChange={(v) => patch({ quantiteArticles: v })}
                placeholder="12"
              />
            </FormCell>
            <FormCell
              label={t('booking.viewsItem')}
              error={errors.vuesParArticle}
            >
              <FormCellInput
                name="views_per_item"
                value={contact.vuesParArticle}
                type="number"
                onChange={(v) => patch({ vuesParArticle: v })}
                placeholder="3"
              />
            </FormCell>
          </>
        )}
        <FormCell
          label={t('booking.otherInformation')}
          className="col-span-1 @sm:col-span-2"
        >
          <FormCellTextarea
            name="message"
            value={contact.autresInfos || ''}
            onChange={(autresInfos) => patch({ autresInfos })}
            placeholder={t('booking.constraintsInspirationsReferencesOptional')}
          />
        </FormCell>
        <FormCell
          as="group"
          label="CGV *"
          error={errors.cgvAccepted}
          className="col-span-1 @sm:col-span-2"
        >
          {/* Un `<label>` et la case du design system telle quelle. Le
              `size-3.5` posé ici l'enfermait dans 14px alors que son icône en
              mesure 14 : une quatrième géométrie de case, à côté des 16px de
              l'étape équipe et du reste du site. Et c'était un `<div>` : la
              phrase ne cochait rien.

              `items-start` parce que la phrase passe à deux lignes dès le
              mobile — une case centrée sur le bloc ne désigne alors aucune des
              deux ; `mt-px` la recentre sur la première ligne, le décalage que
              `field.tsx` applique déjà à toute case dans un champ horizontal. */}
          <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
            <Checkbox
              name="cgv_accepted"
              checked={contact.cgvAccepted}
              onCheckedChange={(next: boolean) => patch({ cgvAccepted: next })}
              className="mt-px"
            />
            {/* Le `<span>` tient la phrase ensemble : `<Trans>` rend trois
                nœuds frères (texte, lien, texte) que le flex du label
                poserait sinon côte à côte comme trois éléments. */}
            <span>
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
          </label>
        </FormCell>
      </div>
    </div>
  );
};

export { StepContact };
export type { StepContactProps };
