/*
The MIT License (MIT)

Copyright (c) 2015-2016 Solid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/solid
*/
'use strict'
/**
 * Provides a Solid client helper object (which exposes various static modules).
 * @module solidUi.js
 * @main solidUi.js
 */

/**
 * @class SolidUi
 * @static
 */

// REMOVE @ts-ignore as you migrate files to TypeScript
import * as rdf from 'rdflib' // pull in first avoid cross-refs
// @ts-ignore
import ns from './ns'
import { acl, aclControl } from './acl/index'
import { authn } from './authn/index'
// @ts-ignore
import create from './create'
// @ts-ignore
import icons from './iconBase'
import * as log from './log'
// @ts-ignore
import matrix from './matrix'
// @ts-ignore
import media from './media-capture'
// @ts-ignore
import messageArea from './messageArea'
// @ts-ignore
import { infiniteMessageArea } from './chat/infinite'
// @ts-ignore
import pad from './pad'
// @ts-ignore
import preferences from './preferences'
// @ts-ignore
import store from './store'
// @ts-ignore
import style from './style'
// @ts-ignore
import table from './table'
import * as tabs from './tabs'
// @ts-ignore
import utils from './utils'
import widgets from './widgets'
import versionInfo from './versionInfo'
import { initHeader } from './header'

const dom = window ? window.document : null // Idea that UI.dom can be adapted in non-browser environments

if (typeof window !== 'undefined') {
  ;(<any>window).UI = {
    ns,
    rdf,
    acl,
    aclControl,
    authn,
    create,
    dom,
    icons,
    log,
    matrix,
    media,
    messageArea,
    infiniteMessageArea,
    pad,
    preferences,
    store,
    style,
    table,
    tabs,
    utils,
    widgets,
    versionInfo,
    initHeader
  } // Simpler access by non-node scripts
}

export {
  ns,
  rdf,
  acl,
  aclControl,
  authn,
  create,
  dom,
  icons,
  log,
  matrix,
  media,
  messageArea,
  infiniteMessageArea,
  pad,
  preferences,
  store,
  style,
  table,
  tabs,
  utils,
  widgets,
  versionInfo,
  initHeader
}
