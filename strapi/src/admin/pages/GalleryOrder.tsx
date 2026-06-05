import * as React from 'react';
import { useFetchClient, useNotification, Layouts, Page } from '@strapi/strapi/admin';
import { Box, Button, Flex, Typography } from '@strapi/design-system';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ProjectRow = {
  documentId: string;
  displayOrder: number;
  brand: string;
  category: string;
  year: string;
  stage: string;
  coverUrl: string | null;
  coverIsVideo: boolean;
};

function ProjectCard({ project }: { project: ProjectRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.documentId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    touchAction: 'none',
  };

  const label = [project.brand, project.year].filter(Boolean).join(' · ');

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      hasRadius
      overflow="hidden"
      background="neutral0"
      shadow="tableShadow"
      borderColor="neutral200"
    >
      <Box
        background="neutral150"
        style={{ aspectRatio: '4 / 3', position: 'relative' }}
      >
        {project.coverUrl && !project.coverIsVideo ? (
          <img
            src={project.coverUrl}
            alt={label}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Flex height="100%" alignItems="center" justifyContent="center">
            <Typography variant="pi" textColor="neutral500">
              {project.coverIsVideo ? '🎬' : '—'}
            </Typography>
          </Flex>
        )}
      </Box>
      <Box padding={2}>
        <Typography variant="omega" fontWeight="bold" ellipsis tag="p">
          {label || project.documentId}
        </Typography>
        <Typography variant="pi" textColor="neutral600" tag="p">
          {[project.category, project.stage].filter(Boolean).join(' / ')}
        </Typography>
      </Box>
    </Box>
  );
}

const GalleryOrder = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    get('/gallery-projects/order-list')
      .then(({ data }) => {
        if (alive) setProjects(data as ProjectRow[]);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [get]);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setProjects((prev) => {
      const oldIndex = prev.findIndex((p) => p.documentId === active.id);
      const newIndex = prev.findIndex((p) => p.documentId === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setDirty(true);
  }, []);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    const items = projects.map((p, index) => ({
      documentId: p.documentId,
      displayOrder: index,
    }));
    try {
      await put('/gallery-projects/reorder', { items });
      setDirty(false);
      toggleNotification({ type: 'success', message: 'Ordre enregistré.' });
    } catch {
      toggleNotification({
        type: 'danger',
        message: "Échec de l'enregistrement de l'ordre.",
      });
    } finally {
      setSaving(false);
    }
  }, [projects, put, toggleNotification]);

  if (loading) return <Page.Loading />;
  if (error) return <Page.Error />;

  return (
    <Layouts.Root>
      <Page.Title>Ordre galerie</Page.Title>
      <Layouts.Header
        title="Ordre galerie"
        subtitle="Glissez-déposez les projets pour définir leur ordre d'affichage dans la galerie publique."
        primaryAction={
          <Button onClick={handleSave} loading={saving} disabled={!dirty || saving}>
            Enregistrer l'ordre
          </Button>
        }
      />
      <Layouts.Content>
        {projects.length === 0 ? (
          <Box padding={8} background="neutral0" hasRadius>
            <Typography textColor="neutral600">Aucun projet à ordonner.</Typography>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={projects.map((p) => p.documentId)}
              strategy={rectSortingStrategy}
            >
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '16px',
                }}
              >
                {projects.map((p) => (
                  <ProjectCard key={p.documentId} project={p} />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        )}
      </Layouts.Content>
    </Layouts.Root>
  );
};

export { GalleryOrder };
export default GalleryOrder;
