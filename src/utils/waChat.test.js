import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  phoneKey,
  groupMessagesByDay,
  templateBody,
  templateVariableCount,
  buildTemplatePayload,
} from './waChat.js';

describe('phoneKey', () => {
  test('compara por los últimos 10 dígitos', () => {
    assert.equal(phoneKey('+57 316 687 6163'), '3166876163');
    assert.equal(phoneKey('3166876163'), '3166876163');
  });
  test('vacío sin número', () => {
    assert.equal(phoneKey(null), '');
  });
});

describe('groupMessagesByDay', () => {
  const now = new Date(2026, 10, 2, 16, 0); // lunes 2 nov 2026
  const msg = (id, y, m, d, h = 10) => ({ id, created_at: new Date(y, m, d, h).toISOString() });

  test('agrupa por día con Hoy, Ayer y fecha larga', () => {
    const groups = groupMessagesByDay([
      msg('a', 2026, 9, 30, 9),
      msg('b', 2026, 9, 30, 16),
      msg('c', 2026, 10, 1),
      msg('d', 2026, 10, 2),
    ], now);
    assert.deepEqual(groups.map((g) => g.label), ['viernes 30 de octubre', 'Ayer', 'Hoy']);
    assert.deepEqual(groups[0].messages.map((m) => m.id), ['a', 'b']);
  });

  test('lista vacía', () => {
    assert.deepEqual(groupMessagesByDay([], now), []);
  });

  test('ignora mensajes sin fecha válida', () => {
    const groups = groupMessagesByDay([{ id: 'x', created_at: null }, msg('d', 2026, 10, 2)], now);
    assert.deepEqual(groups.map((g) => g.messages.map((m) => m.id)), [['d']]);
  });
});

describe('plantillas', () => {
  const schema = [
    { type: 'HEADER', format: 'TEXT', text: 'Pitbox' },
    { type: 'BODY', text: 'Hola {{1}}, te escribimos de {{2}} para retomar tu solicitud.' },
  ];

  test('templateBody devuelve el texto del BODY', () => {
    assert.equal(templateBody(schema), 'Hola {{1}}, te escribimos de {{2}} para retomar tu solicitud.');
    assert.equal(templateBody(null), '');
  });

  test('templateVariableCount cuenta variables distintas', () => {
    assert.equal(templateVariableCount(schema), 2);
    assert.equal(templateVariableCount([{ type: 'BODY', text: 'Sin variables' }]), 0);
    assert.equal(templateVariableCount([{ type: 'BODY', text: '{{1}} y {{1}}' }]), 1);
  });

  test('buildTemplatePayload llena nombre y taller', () => {
    const r = buildTemplatePayload({
      template: { name: 'retomar', language: 'es', components_schema: schema },
      customerName: 'Alba Gonzalez',
      companyName: 'Pitbox Motos',
    });
    assert.equal(r.ok, true);
    assert.equal(r.preview, 'Hola Alba, te escribimos de Pitbox Motos para retomar tu solicitud.');
    assert.deepEqual(r.components, [
      { type: 'body', parameters: [{ type: 'text', text: 'Alba' }, { type: 'text', text: 'Pitbox Motos' }] },
    ]);
  });

  test('sin variables no manda components', () => {
    const r = buildTemplatePayload({
      template: { name: 'x', language: 'es', components_schema: [{ type: 'BODY', text: 'Hola' }] },
      customerName: 'Alba',
      companyName: 'P',
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.components, []);
  });

  test('usa "cliente" si no hay nombre', () => {
    const r = buildTemplatePayload({
      template: { name: 'x', language: 'es', components_schema: [{ type: 'BODY', text: 'Hola {{1}}' }] },
      customerName: '',
      companyName: 'P',
    });
    assert.equal(r.preview, 'Hola cliente');
  });

  test('más de 2 variables no se puede usar', () => {
    const r = buildTemplatePayload({
      template: { name: 'x', language: 'es', components_schema: [{ type: 'BODY', text: '{{1}} {{2}} {{3}}' }] },
      customerName: 'A',
      companyName: 'B',
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /3 datos/);
  });

  test('plantilla con encabezado de imagen no se puede usar', () => {
    const r = buildTemplatePayload({
      template: { name: 'x', language: 'es', components_schema: [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Hola' }] },
      customerName: 'A',
      companyName: 'B',
    });
    assert.equal(r.ok, false);
  });

  const build = (components_schema) =>
    buildTemplatePayload({ template: { name: 'x', language: 'es', components_schema }, customerName: 'A', companyName: 'B' });

  test('variables que no empiezan en {{1}} no se pueden usar', () => {
    const r = build([{ type: 'BODY', text: 'Hola {{2}}' }]);
    assert.equal(r.ok, false);
  });

  test('encabezado de texto con variable no se puede usar', () => {
    const r = build([{ type: 'HEADER', format: 'TEXT', text: 'Hola {{1}}' }, { type: 'BODY', text: 'Hola' }]);
    assert.equal(r.ok, false);
  });

  test('botón con URL dinámica no se puede usar', () => {
    const r = build([
      { type: 'BODY', text: 'Hola' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Ver', url: 'https://x.co/{{1}}' }] },
    ]);
    assert.equal(r.ok, false);
  });
});
