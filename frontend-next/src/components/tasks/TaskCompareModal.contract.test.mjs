import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modalSource = readFileSync(new URL('./TaskCompareModal.tsx', import.meta.url), 'utf8');
const imageSource = readFileSync(new URL('./taskImageUrls.ts', import.meta.url), 'utf8');

test('one task compare modal uses original urls only for detail preview and download', () => {
  assert.match(modalSource, /export function TaskCompareModal/);
  assert.match(modalSource, /fullTaskImageUrl\(detail\)/);
  assert.match(modalSource, /fullTaskSourceImageUrl\(detail\)/);
  assert.match(imageSource, /export function taskPreviewImageUrl/);
  assert.match(imageSource, /export function fullTaskImageUrl/);
  assert.match(imageSource, /export function fullTaskSourceImageUrl/);
});

test('task compare displays only the user-entered generation requirement', () => {
  assert.match(modalSource, /firstText\(detail\.userPrompt, detail\.detailUserPrompt, detail\.settings\?\.userPrompt\)/);
  assert.doesNotMatch(modalSource, /detail\.settings\?\.userPrompt, detail\.prompt/);
});
