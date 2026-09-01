import { useEffect } from 'react';
import { ToggleRow } from '@/ui/toggle-row';
import { useT } from '../../i18n/use-t';
import type { PostprodState } from '../../lib/booking-engine';

interface StepPostprodProps {
  plateauKey: string;
  postprod: PostprodState;
  setPostprod: (next: PostprodState) => void;
}

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
    // Aucun filet de fermeture : la séparation d'avec le plateau suivant est
    // posée par `MultiPlateauStep`, et celle d'avec la barre d'actions par la
    // barre elle-même. Un `border-b` ici en faisait un second.
    <div className="flex flex-col gap-px bg-border">
      <ToggleRow
        title={t('booking.postProductionByEDo2')}
        hint={t('booking.selectionRetouchingDeliveryQuotedOn')}
        stateLabel={enabled ? yes : no}
        checked={enabled}
        onCheckedChange={() =>
          setPostprod({
            ...postprod,
            enabled: !enabled,
            video: enabled ? false : video,
          })
        }
      />
      {enabled && videoAllowed && (
        <ToggleRow
          title={t('booking.videoEditing3')}
          hint={t('booking.onlyIfYourProjectIncludes')}
          stateLabel={video ? yes : no}
          checked={video}
          onCheckedChange={() => setPostprod({ ...postprod, video: !video })}
        />
      )}
    </div>
  );
};

export { StepPostprod };
export type { StepPostprodProps };
