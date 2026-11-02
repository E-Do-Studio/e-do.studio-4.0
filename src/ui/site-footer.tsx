import { useT } from '../i18n/use-t';
import { captureCta } from '../lib/analytics';
import { ETOUCH_LINK } from '../lib/nav';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { LEGAL_DOCUMENT_KEYS, LEGAL_DOCUMENT_LABELS } from '../lib/strapi';
import { ContactMap } from './contact-map';
import { CtaCell } from './cta-cell';
import { FindUsSection } from './find-us-section';
import { HoursSection } from './hours-section';
import { LabelledCell } from './labelled-cell';
import { MonoLabel } from './mono-label';
import { PhoneCell } from './phone-cell';
import { ReachSection } from './reach-section';
import { SocialLinksRow } from './social-links-row';

const PLATEAUX = [
  { key: 'cyclorama', screen: 'cyclorama' },
  { key: 'live', screen: 'plateau-live' },
  { key: 'eclipse', screen: 'plateau-eclipse' },
  { key: 'horizontal', screen: 'plateau-horizontal' },
  { key: 'vertical', screen: 'plateau-vertical' },
] as const;

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const FooterLinks = ({
  label,
  links,
}: {
  label: string;
  links: FooterLink[];
}) => (
  <section className="bg-background py-6">
    <LabelledCell pad="section" label={label}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm leading-snug">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              {...(link.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className="text-foreground no-underline"
            >
              {link.label}
              {link.external && ' ↗'}
            </a>
          </li>
        ))}
      </ul>
    </LabelledCell>
  </section>
);

/**
 * Le pied de page, sous le palier `app` seulement : au-dessus, le bento est
 * verrouillé sur le viewport et n'a pas de bas de page où le poser.
 *
 * Il ne redessine rien : adresse, horaires, contact et carte sont les cellules
 * de la page contact, le numéro celui de la bande sociale. `dark` retourne les
 * tokens pour tout ce qu'il contient, comme `CtaCell tone="dark"`.
 */
const SiteFooter = () => {
  const t = useT();
  const { lang, siteData } = usePageContext();
  const contact = siteData.contact;
  const legal = SCREEN_TO_PATH.legal(lang);

  return (
    <footer className="dark col-span-full flex flex-col gap-px bg-border text-foreground app:hidden">
      <CtaCell
        title={t('common.book')}
        href={SCREEN_TO_PATH.book(lang)}
        onClick={() => captureCta('book')}
      />
      <FindUsSection lang={lang} contact={contact} />
      <ContactMap contact={contact} className="aspect-square" />
      <HoursSection lang={lang} hours={siteData.studioHours} />
      <ReachSection contact={contact} />
      <nav
        aria-label={t('footer.nav')}
        className="grid grid-cols-2 gap-px bg-border"
      >
        <FooterLinks
          label={t('common.stages')}
          links={PLATEAUX.map(({ key, screen }) => ({
            label: t(`home.offers.${key}.title`),
            href: SCREEN_TO_PATH[screen](lang),
          }))}
        />
        <FooterLinks
          label={t('footer.studio')}
          links={[
            {
              label: t('common.studioRental'),
              href: SCREEN_TO_PATH['studio-rental'](lang),
            },
            {
              label: t('footer.onModel'),
              href: SCREEN_TO_PATH['on-model'](lang),
            },
            {
              label: t('common.postProdLong'),
              href: SCREEN_TO_PATH.postprod(lang),
            },
            { label: t('common.gallery'), href: SCREEN_TO_PATH.gallery(lang) },
            {
              label: t('common.discovery'),
              href: SCREEN_TO_PATH.discovery(lang),
            },
            { label: t('common.contact'), href: SCREEN_TO_PATH.contact(lang) },
            {
              label: ETOUCH_LINK.label,
              href: ETOUCH_LINK.href,
              external: true,
            },
          ]}
        />
      </nav>
      <FooterLinks
        label={t('common.legal')}
        links={LEGAL_DOCUMENT_KEYS.map((key) => ({
          label: LEGAL_DOCUMENT_LABELS[key][lang],
          href: key === 'mentions' ? legal : `${legal}?doc=${key}`,
        }))}
      />
      <SocialLinksRow
        layout="row"
        className="auto-rows-[var(--spacing-band)]"
      />
      {contact?.phone && contact.phoneHref && (
        <PhoneCell phone={contact.phone} phoneHref={contact.phoneHref} />
      )}
      <div className="bg-background px-5 py-4">
        <MonoLabel tone="muted">
          © {new Date().getFullYear()} E-Do Studio
        </MonoLabel>
      </div>
    </footer>
  );
};

export { SiteFooter };
