import { useCallback, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, CalendarDays, Car, MapPin } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { joinCar, leaveCar, listCars, listEvents, upsertMyCar } from '../../data/events';
import type { EventCar } from '../../domain/types';
import { useLoad } from '../../shared/lib/loadable';
import { describeError, useAction } from '../../shared/lib/useAction';
import { Avatar, AvatarStack, Badge, Banner, Button, Card, CardHeader, EmptyState, Input, List, ListItem, Sheet, Skeleton, TextArea, TopBar } from '../../shared/ui';
import { useMembers } from '../members/hooks';
import { carSeatsLeft, formatEventDate, seatsLeft } from './board';

const MAX_SEATS = 8;
const DEFAULT_SEATS = 3;

/** `/g/:gid/events/:eid`: event facts, cars with open seats, ride / leave and offer my car. */
export function EventDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { eid = '' } = useParams();
  const { group, me } = useGroup();
  const [members] = useMembers(group.id);
  const [offering, setOffering] = useState(false);
  const [state, reload] = useLoad(async () => {
    const [events, cars] = await Promise.all([listEvents(group.id), listCars(group.id, eid)]);
    return { event: events.find((e) => e.id === eid) ?? null, cars };
  }, [group.id, eid]);
  const names = useMemo(() => new Map(members.status === 'ready' ? members.data.map((m) => [m.uid, m.displayName]) : []), [members]);
  const act = useCallback(async (op: () => Promise<void>) => {
    await op();
    reload();
  }, [reload]);
  const { busy, run } = useAction(act);
  const back = () => navigate(`/g/${group.id}/events`);

  const body = (() => {
    if (state.status === 'loading') return <Skeleton className="h-48" />;
    if (state.status === 'error') {
      return <EmptyState icon={<AlertCircle />} title={t('dashboard.loadError')} description={describeError(state.error)} action={<Button onClick={reload}>{t('dashboard.retry')}</Button>} />;
    }
    const { event, cars } = state.data;
    if (!event) return <EmptyState icon={<AlertCircle />} title={t('rideboard.detail.notFound')} action={<Button onClick={back}>{t('rideboard.title')}</Button>} />;
    const myCar = cars.find((c) => c.driverId === me.uid) ?? null;
    const ridingIn = cars.find((c) => c.riderIds.includes(me.uid))?.driverId ?? null;
    const sorted = [...cars].sort((a, b) => Number(b.driverId === me.uid) - Number(a.driverId === me.uid) || a.driverName.localeCompare(b.driverName));
    const trailing = (car: EventCar) => {
      if (car.driverId === me.uid) return <Badge variant="brand">{t('rideboard.detail.mine')}</Badge>;
      if (ridingIn === car.driverId) {
        return (
          <>
            <Badge variant="success">{t('rideboard.detail.riding')}</Badge>
            <Button variant="ghost" disabled={busy} onClick={() => run(() => leaveCar(group.id, eid, car.driverId, me.uid))} data-testid={`car-leave-${car.driverId}`}>
              {t('rideboard.detail.leave')}
            </Button>
          </>
        );
      }
      if (carSeatsLeft(car) === 0) return <Badge>{t('rideboard.full')}</Badge>;
      if (ridingIn !== null || myCar !== null) return null;
      return (
        <Button disabled={busy} onClick={() => run(() => joinCar(group.id, eid, car.driverId, me.uid))} data-testid={`car-join-${car.driverId}`}>
          {t('rideboard.detail.ride')}
        </Button>
      );
    };
    return (
      <>
        <Card padding="lg">
          <h2 className="text-title-2 text-ink" data-testid="event-detail-title">{event.title}</h2>
          <p className="mt-3 flex items-center gap-2 text-body text-ink-2 tabular-nums">
            <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
            {t('rideboard.when', { date: formatEventDate(event.date, i18n.language), time: event.time })}
          </p>
          <p className="mt-1 flex items-center gap-2 text-body text-ink-2">
            <MapPin aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
            <span className="wrap-anywhere">{event.place}</span>
          </p>
        </Card>
        {cars.length > 0 && seatsLeft(cars) === 0 && <Banner variant="info">{t('rideboard.detail.fullBanner')}</Banner>}
        <Card as="section" padding="none" aria-label={t('rideboard.detail.cars')}>
          <CardHeader className="p-4 pb-3" title={t('rideboard.detail.cars')} />
          {cars.length === 0 ? (
            <EmptyState compact icon={<Car />} title={t('rideboard.detail.carsEmpty')} description={t('rideboard.detail.carsEmptyHint')} />
          ) : (
            <List inset={false} className="border-t border-line" data-testid="event-cars">
              {sorted.map((car) => (
                <ListItem
                  key={car.driverId}
                  leading={<Avatar name={car.driverName} marker={<Car />} />}
                  title={<span data-testid={`car-${car.driverId}`}>{car.driverName}</span>}
                  description={
                    <span className="flex flex-col gap-1.5">
                      <span>{t('rideboard.detail.carLine', { seats: car.seats, riders: car.riderIds.length })}</span>
                      {car.note && <span className="text-caption text-ink-3">{car.note}</span>}
                      {car.riderIds.length > 0 && <AvatarStack size="xs" people={car.riderIds.map((uid) => ({ name: names.get(uid) ?? uid }))} />}
                    </span>
                  }
                  trailing={trailing(car)}
                />
              ))}
            </List>
          )}
        </Card>
        {me.canDrive && (
          <Button size="lg" fullWidth variant={myCar ? 'secondary' : 'primary'} leadingIcon={<Car />} onClick={() => setOffering(true)} data-testid="car-offer">
            {myCar ? t('rideboard.detail.editCar') : t('rideboard.detail.offer')}
          </Button>
        )}
        <OfferCarSheet
          key={myCar ? `${myCar.seats}|${myCar.note}` : 'new'}
          open={offering}
          initial={myCar}
          onClose={() => setOffering(false)}
          onSave={(seats, note) => run(async () => {
            await upsertMyCar(group.id, eid, me.uid, { driverName: me.displayName, seats, note });
            setOffering(false);
          })}
          busy={busy}
          defaultSeats={me.seats > 0 ? me.seats : DEFAULT_SEATS}
        />
      </>
    );
  })();

  return (
    <>
      <TopBar title={state.status === 'ready' && state.data.event ? state.data.event.title : t('rideboard.title')} onBack={back} backLabel={t('rideboard.detail.back')} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-safe-nav">{body}</main>
    </>
  );
}

interface OfferCarSheetProps {
  readonly open: boolean;
  readonly initial: EventCar | null;
  readonly busy: boolean;
  readonly defaultSeats: number;
  readonly onClose: () => void;
  readonly onSave: (seats: number, note: string) => void;
}

function OfferCarSheet({ open, initial, busy, defaultSeats, onClose, onSave }: OfferCarSheetProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [seats, setSeats] = useState(String(initial?.seats ?? defaultSeats));
  const [note, setNote] = useState(initial?.note ?? '');
  const seatCount = Number(seats);
  const valid = Number.isInteger(seatCount) && seatCount >= Math.max(1, initial?.riderIds.length ?? 0) && seatCount <= MAX_SEATS;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSave(seatCount, note.trim());
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('rideboard.carForm.title')}
      closeLabel={t('rideboard.close')}
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth disabled={!valid} loading={busy} data-testid="car-offer-submit">
          {t('rideboard.carForm.submit')}
        </Button>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <Input
          type="number"
          inputMode="numeric"
          min={Math.max(1, initial?.riderIds.length ?? 0)}
          max={MAX_SEATS}
          label={t('rideboard.carForm.seats')}
          required
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          data-testid="car-seats"
        />
        <TextArea
          label={t('rideboard.carForm.note')}
          optionalLabel={t('rideboard.carForm.optional')}
          placeholder={t('rideboard.carForm.notePlaceholder')}
          rows={2}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-testid="car-note"
        />
      </form>
    </Sheet>
  );
}
