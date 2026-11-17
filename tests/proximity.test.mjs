import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceInMeters, ProximityMonitor } from '../services/proximity.ts';

const origin = { latitude: 0, longitude: 0 };
const inside = { latitude: 0.00089, longitude: 0 };
const outside = { latitude: 0.00091, longitude: 0 };
const first = { id: 1, coordinate: origin };
const second = { id: 2, coordinate: origin };
const allowed = () => true;
const blocked = () => false;

function setup(overrides = {}) {
  const shown = [];
  const removed = [];
  const monitor = new ProximityMonitor({
    async show(id) { shown.push(id); return String(id); },
    async remove(id) { removed.push(id); },
    ...overrides,
  });
  return { monitor, shown, removed };
}

test('Расстояние в метрах и переход через антимеридиан', () => {
  assert.equal(distanceInMeters(origin, origin), 0);
  assert.ok(Math.abs(distanceInMeters(origin, { latitude: 1, longitude: 0 }) - 111_195) < 1);
  const west = { latitude: 0, longitude: -179.9999 };
  const east = { latitude: 0, longitude: 179.9999 };
  assert.ok(Math.abs(distanceInMeters(west, east) - 22.24) < 0.1);
});

test('Две метки, повторные GPS-события, выход за 100 м и повторный вход', async () => {
  const { monitor, shown, removed } = setup();
  const markers = [first, second];

  await monitor.update(outside, markers, allowed);
  assert.deepEqual(shown, []);
  await Promise.all([
    monitor.update(inside, markers, allowed),
    monitor.update(origin, markers, allowed),
  ]);
  assert.deepEqual(shown, [1, 2]);
  await monitor.update(outside, markers, allowed);
  assert.deepEqual(removed, ['1', '2']);
  await monitor.update(inside, markers, allowed);
  assert.deepEqual(shown, [1, 2, 1, 2]);
});

test('Без разрешения нет отправки, без координат можно очистить удалённую метку', async () => {
  const { monitor, shown, removed } = setup();
  await monitor.update(origin, [first, second], blocked);
  assert.deepEqual(shown, []);
  await monitor.update(origin, [first, second], allowed);
  await monitor.update(null, [second], blocked);
  assert.deepEqual(removed, ['1']);
  await monitor.update(origin, [second], allowed);
  assert.deepEqual(shown, [1, 2]);
});

test('Сбой отправки одной метки не блокирует другие, очередь обрабатывает повтор', async () => {
  const sent = [];
  let fail = true;
  const { monitor } = setup({
    async show(id) {
      if (id === 1 && fail) throw new Error('show failed');
      sent.push(id);
      return String(id);
    },
  });
  await assert.rejects(monitor.update(origin, [first, second], allowed));
  assert.deepEqual(sent, [2]);
  fail = false;
  await monitor.update(origin, [first, second], allowed);
  assert.deepEqual(sent, [2, 1]);
});

test('Очередь очищает уведомление после незавершённой отправки и повторяет сбой очистки', async () => {
  const send = Promise.withResolvers();
  const started = Promise.withResolvers();
  let attempts = 0;
  const { monitor } = setup({
    async show() { started.resolve(); return send.promise; },
    async remove() {
      attempts += 1;
      if (attempts === 1) throw new Error('remove failed');
    },
  });
  const entering = monitor.update(inside, [first], allowed);
  await started.promise;
  const leaving = monitor.update(outside, [first], allowed);
  send.resolve('1');
  await entering;
  await assert.rejects(leaving);
  await monitor.update(outside, [first], allowed);
  assert.equal(attempts, 2);
});
