import { useNavigate } from '@tanstack/react-router';
import { useT } from '../i18n/use-t';
import { manualPath } from '../book/book-routes';
import { captureCta } from '../lib/analytics';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import type { PlateauSpec } from '../lib/strapi';
import { cn } from '@/lib/utils';
import { CtaCell } from '../ui/cta-cell';
import { KeyValueList, KeyValueRow } from '../ui/key-value-row';
import { MediaFrame } from '../ui/media-frame';
import { ResponsiveImage } from '../ui/responsive-image';
import { SectionIntro } from '../ui/section-intro';
import { DimRow } from './dim-row';
import { type SpaceZoneId, STUDIO_DIMS, zoneById, type ZoneId } from './zones';

interface ZoneSheetProps {
  zone: ZoneId;
  plateaux: Record<string, PlateauSpec> | null;
  className?: string;
}

/**
 * La fiche de la zone choisie sur la maquette.
 *
 * Un plateau parle avec la voix de sa page : tagline, caractéristiques, tarif
 * et photo viennent du même enregistrement Strapi, pour qu'une surface ou un
 * prix ne puisse pas différer d'une page à l'autre. Les autres zones n'ont pas
 * de fiche CMS ; leur texte et leurs cotes viennent du relevé du scan.
 */
export const ZoneSheet = ({ zone, plateaux, className }: ZoneSheetProps) => {
  const t = useT();
  const { lang, goto } = usePageContext();
  const navigate = useNavigate();
  const info = zoneById(zone);
  const plateau = info.plateau ? plateaux?.[info.plateau] : undefined;
  const image = plateau?.media.find((m) => m.kind === 'image');
  const name = t(`studioTour.zones.${zone}.name`);
  const stageScreen =
    info.plateau === 'cyclorama' ? 'cyclorama' : `plateau-${info.plateau}`;

  return (
    <div
      className={cn(
        // La colonne ne défile pas : le site est verrouillé sur la hauteur de
        // l'écran, et c'est le bouton de réservation, en bas, qui y serait
        // passé sous la ligne de flottaison. Seule la liste cède, plus haut.
        'flex min-h-0 flex-col gap-px bg-border app:overflow-hidden',
        className,
      )}
    >
      <SectionIntro
        as="h2"
        size="sm"
        kicker={t('studioTour.zone')}
        title={name}
        subtitle={
          info.plateau
            ? (plateau?.tagline[lang] ?? undefined)
            : t(`studioTour.zones.${zone as SpaceZoneId}.text`)
        }
        className={cn('bg-background', !plateau && 'app:flex-1')}
      />

      {image && (
        // Un ratio fixe et `contain` : la photo n'est jamais recadrée, et la
        // colonne n'a pas à l'étirer pour se remplir — ce sont les listes en
        // dessous qui prennent la hauteur restante.
        <MediaFrame ratio="photo" tone="background" className="flex-none">
          <ResponsiveImage
            src={image.url}
            alt={image.alt[lang] || name}
            originalWidth={image.width}
            sizes="(min-width: 1024px) 25vw, 100vw"
            fit="contain"
          />
        </MediaFrame>
      )}

      {plateau && (
        <div className="flex flex-col gap-3 bg-background py-3 app:min-h-0 app:flex-1 app:overflow-y-auto">
          {/* Quatre caractéristiques : la page plateau, à un clic, les porte
              toutes. Au-delà, la fiche ne tenait plus dans 900px de haut. */}
          <KeyValueList pad="tight" heading={t('plateau.specs')}>
            {plateau.specs.slice(0, 4).map((s) => (
              <KeyValueRow
                key={s.k.fr}
                density="tight"
                label={s.k[lang]}
                // Le CMS sépare ses mentions par « · » : la ligne les rend en
                // phrase, comme la page plateau.
                value={
                  <span className="line-clamp-2">
                    {(s.v[lang] || '').split(' · ').join(' ')}
                  </span>
                }
              />
            ))}
          </KeyValueList>
          <KeyValueList pad="tight" heading={t('plateau.rates')}>
            {plateau.rates.map((r) => (
              <KeyValueRow
                key={r.k.fr}
                density="tight"
                numeric
                label={r.k[lang]}
                value={typeof r.v === 'string' ? r.v : r.v[lang]}
              />
            ))}
          </KeyValueList>
        </div>
      )}

      {!info.plateau && (
        <div className="flex flex-none flex-col gap-3 bg-background py-3">
          {info.facts && (
            <KeyValueList pad="tight">
              {info.facts.map((f) => (
                <KeyValueRow
                  key={f}
                  density="tight"
                  label={t(`studioTour.facts.${f}.label`)}
                  value={t(`studioTour.facts.${f}.value`)}
                />
              ))}
            </KeyValueList>
          )}
          <KeyValueList pad="tight" heading={t('studioTour.studio')}>
            {STUDIO_DIMS.map((d) => (
              <DimRow key={d.key} dim={d} />
            ))}
          </KeyValueList>
        </div>
      )}

      {info.plateau && (
        <CtaCell
          tone="surface"
          title={t('studioTour.seeStage')}
          href={SCREEN_TO_PATH[stageScreen](lang)}
          onClick={() => goto(stageScreen)}
          className="flex-none"
        />
      )}
      <CtaCell
        title={info.plateau ? t('common.bookThisStage') : t('common.bookNow')}
        onClick={() => {
          if (info.plateau) {
            captureCta('book_stage', info.plateau);
            navigate({
              to: manualPath(lang),
              search: { plateau: info.plateau },
            });
          } else goto('book');
        }}
        className="flex-none"
      />
    </div>
  );
};
