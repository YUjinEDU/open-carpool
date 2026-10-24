import { useCallback, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AlertCircle, CalendarPlus, MapPin } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { createEvent, listCars, listEvents, type CreateEventInput } from '../../data/events';
import { DEFAULT_TZ, today as todayIn } from '../../domain/dates';
import { useLoad } from '../../shared/lib/loadable';
import { useAction } from '../../shared/lib/useAction';
import { Badge, Button, EmptyState, IconButton, Input, List, ListItem, Sheet, Skeleton, TimeField, TopBar } from '../../shared/ui';
import { compareEvents, formatEventDate, seatsLeft } from './board';

const EMPTY_FORM: CreateEventInput = { title: '', date: '', time: '', place: '' };

/** `/g/:gid/events`: upcoming one-off events with their open seats, and the create-event sheet. */
export function EventsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { group } = useGroup();
  const [creating, setCreating] = useState(false);
  // Groups carry no time zone yet; the trip planner uses the same default zone.
  const today = todayIn(DEFAULT_TZ);
  const [state, reload] = useLoad(async () => {
    const events = (await listEvents(group.id)).filter((e) => e.date >= today).sort(compareEvents);
    const cars = await Promise.all(events.map((e) => listCars(group.id, e.id)));
    return events.map((event, i) => ({ event, cars: cars[i] ?? [] }));
  }, [group.id, today]);
  const open = (eid: string) => navigate(`/g/${group.id}/events/${eid}`);
  const newButton = <IconButton label={t('rideboard.new')} icon={<CalendarPlus />} onClick={() => setCreating(true)} data-testid="event-new" />;

  return (
    <>
      <TopBar title={t('rideboard.title')} trailing={newButton} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-safe-nav">
        {state.status === 'loading' && <Skeleton className="h-40" />}
        {state.status === 'error' && (
          <EmptyState icon={<AlertCircle />} title={t('dashboard.loadError')} description={state.error.message} action={<Button onClick={reload}>{t('dashboard.retry')}</Button>} />
        )}
        {state.status === 'ready' && state.data.length === 0 && (
          <EmptyState
            icon={<CalendarPlus />}
            title={t('rideboard.empty')}
            description={t('rideboard.emptyHint')}
            action={<Button onClick={() => setCreating(true)}>{t('rideboard.new')}</Button>}
          />
        )}
        {state.status === 'ready' && state.data.length > 0 && (
          <List>
            {state.data.map(({ event, cars }) => {
              const left = seatsLeft(cars);
              const href = `/g/${group.id}/events/${event.id}`;
              return (
                <ListItem
                  key={event.id}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    open(event.id);
                  }}
                  title={<span data-testid={`event-card-${event.id}`}>{event.title}</span>}
                  description={
                    <span className="flex flex-col">
                      <span className="tabular-nums">{t('rideboard.when', { date: formatEventDate(event.date, i18n.language), time: event.time })}</span>
                      <span className="flex items-center gap-1 truncate"><MapPin aria-hidden="true" className="size-4 shrink-0" />{event.place}</span>
                    </span>
                  }
                  trailing={
                    cars.length === 0 ? (
                      <Badge>{t('rideboard.noCars')}</Badge>
                    ) : left > 0 ? (
                      <Badge variant="success">{t('rideboard.seatsLeft', { count: left })}</Badge>
                    ) : (
                      <Badge>{t('rideboard.full')}</Badge>
                    )
                  }
                />
              );
            })}
          </List>
        )}
      </main>
      <CreateEventSheet open={creating} onClose={() => setCreating(false)} onCreated={open} />
    </>
  );
}

interface CreateEventSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: (eid: string) => void;
}

function CreateEventSheet({ open, onClose, onCreated }: CreateEventSheetProps) {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const formId = useId();
  const [form, setForm] = useState<CreateEventInput>(EMPTY_FORM);
  const set = (key: keyof CreateEventInput) => (e: { readonly target: { readonly value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const complete = form.title.trim() !== '' && form.date !== '' && form.time !== '' && form.place.trim() !== '';
  const create = useCallback(async () => {
    const event = await createEvent(group.id, { ...form, title: form.title.trim(), place: form.place.trim() }, me.uid);
    setForm(EMPTY_FORM);
    onClose();
    onCreated(event.id);
  }, [group.id, me.uid, form, onClose, onCreated]);
  const { busy, run } = useAction(create);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (complete) run();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('rideboard.form.title')}
      closeLabel={t('rideboard.close')}
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth disabled={!complete} loading={busy} data-testid="event-create-submit">
          {t('rideboard.form.submit')}
        </Button>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <Input label={t('rideboard.form.titleLabel')} required value={form.title} onChange={set('title')} maxLength={80} data-testid="event-title" />
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label={t('rideboard.form.date')} required value={form.date} onChange={set('date')} data-testid="event-date" />
          <TimeField label={t('rideboard.form.time')} required value={form.time} onChange={set('time')} data-testid="event-time" />
        </div>
        <Input label={t('rideboard.form.place')} required value={form.place} onChange={set('place')} maxLength={120} leading={<MapPin />} data-testid="event-place" />
      </form>
    </Sheet>
  );
}
