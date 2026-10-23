import test from 'node:test';
import assert from 'node:assert/strict';
import { createPalette } from '../app/hive3d.js';

test('la escena obtiene tonos de estaciones y estados desde los tokens de marca', () => {
  const tokens = {
    '--zolvani-fondo': '#2B0D12', '--zolvani-superficie': '#4E242A', '--zolvani-borgona': '#733B44',
    '--zolvani-cobre-profundo': '#906961', '--zolvani-cobre-suave': '#AB8978', '--zolvani-rose-gold': '#BA9985',
    '--zolvani-texto': '#F2E7E0', '--zolvani-texto-secundario': '#D2B8A8', '--zolvani-ok': '#9BC9A6',
    '--zolvani-alerta': '#D7B77A', '--zolvani-error': '#E0A29D',
  };

  const palette = createPalette(name => tokens[name]);

  assert.deepEqual(palette.stations, ['#BA9985', '#AB8978', '#906961', '#733B44', '#D2B8A8', '#BA9985', '#906961']);
  assert.equal(palette.floor, '#2B0D12');
  assert.equal(palette.working, '#D7B77A');
  assert.equal(palette.available, '#9BC9A6');
  assert.equal(palette.error, '#E0A29D');
});
