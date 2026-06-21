import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe,it} from 'node:test';

const finalCss=readFileSync(new URL('./styles/overrides/final-fixes.css',import.meta.url),'utf8');
const mobileCss=readFileSync(new URL('./styles/overrides/mobile-app.css',import.meta.url),'utf8');

describe('top navigation responsive layout',()=>{
  it('keeps the tablet and compact desktop header on one line',()=>{
    assert.match(finalCss,/@media\s*\(min-width:861px\)\s*and\s*\(max-width:1180px\)/);
    assert.match(finalCss,/\.topApp \.topbar[\s\S]*flex-wrap:nowrap\s*!important/);
    assert.match(finalCss,/\.topApp \.topNav[\s\S]*flex-basis:auto\s*!important/);
    assert.match(finalCss,/\.topApp \.topMain[\s\S]*padding:102px 20px 70px\s*!important/);
    assert.match(finalCss,/@media\s*\(min-width:861px\)\s*and\s*\(max-width:980px\)[\s\S]*\.navGroupLabel[\s\S]*display:none\s*!important/);
  });

  it('switches to the existing mobile header at 860px',()=>{
    assert.match(mobileCss,/@media\s*\(max-width:\s*860px\)/);
    assert.match(mobileCss,/\.topApp \.topbar[\s\S]*flex-wrap:\s*nowrap\s*!important/);
  });
});
