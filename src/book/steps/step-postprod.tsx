import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useT } from '../../i18n/use-t';
import type { PostprodState } from '../../lib/booking-engine';

interface StepPostprodProps {
  plateauKey: string;
  postprod: PostprodState;
  setPostprod: (next: PostprodState) => void;
}

const PostprodRow = ({
  on,
  title,
  hint,
  onToggle,
  yes,
  no,
}: {
  on: boolean;
  title: string;
  hint: string;
  onToggle: () => void;
  yes: string;
  no: string;
}) => (
  <div
    className={cn(
      'bg-background px-5 md:px-6 py-5 flex items-center justify-between gap-5 border-l-4',
      on ? 'border-l-primary' : 'border-l-transparent',
    )}
  >
    <div>
      <div className="text-base font-medium tracking-tight">{title}</div>
      <div className="font-mono text-xs text-muted-foreground mt-1 leading-normal">
        {hint}
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'font-mono text-xs tracking-wider uppercase',
          on ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {on ? yes : no}
      </span>
      <Switch checked={on} onCheckedChange={onToggle} />
    </div>
  </div>
);

const StepPostprod = ({
  plateauKey,
  postprod,
  setPostprod,
}: StepPostprodProps) => {
  const t = useT();
  const enabled = !!postprod.enabled;
  const video = !!postprod.video;
  const videoAllowed = plateauKey !== 'vertical' && plateauKey !== 'horizontal';

  // `postprod` manquait alors que le corps l'étale : l'effet pouvait réécrire
  // un état périmé et perdre une modification faite entre-temps. Ne boucle pas,
  // `video` passant à false dès le premier passage.
  useEffect(() => {
    if (!videoAllowed && video) setPostprod({ ...postprod, video: false });
  }, [videoAllowed, video, postprod, setPostprod]);

  const yes = t('booking.yes');
  const no = t('booking.no');

  return (
    <div className="px-5 md:px-12 pb-6">
      <div className="flex flex-col gap-px bg-border">
        <PostprodRow
          on={enabled}
          title={t('booking.postProductionByEDo2')}
          hint={t('booking.selectionRetouchingDeliveryQuotedOn')}
          yes={yes}
          no={no}
          onToggle={() =>
            setPostprod({
              ...postprod,
              enabled: !enabled,
              video: enabled ? false : video,
            })
          }
        />
        {enabled && videoAllowed && (
          <PostprodRow
            on={video}
            title={t('booking.videoEditing3')}
            hint={t('booking.onlyIfYourProjectIncludes')}
            yes={yes}
            no={no}
            onToggle={() => setPostprod({ ...postprod, video: !video })}
          />
        )}
      </div>
    </div>
  );
};

export { StepPostprod };
export type { StepPostprodProps };
