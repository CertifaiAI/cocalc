/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Various logic depends on filename extensions, so it is good to centralize that to avoid
duplicating code.  What's below may be pretty dumb though (and we should use some
mimetype library)...
*/

import { file_associations, VIDEO_EXTS, AUDIO_EXTS } from "cocalc/smc-webapp/file-associations";

// see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img
const image = new Set([
  "png",
  "jpg",
  "gif",
  "svg",
  "jpeg",
  "bmp",
  "apng",
  "ico",
]);

export const isImage = (ext) => image.has(ext);

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
const video = new Set(VIDEO_EXTS);
export const isVideo = (ext) => video.has(ext);

const audio = new Set(AUDIO_EXTS);
export const isAudio = (ext) => audio.has(ext);

const pdf = new Set(["pdf"]);
export const isPDF = (ext) => pdf.has(ext);

const html = new Set(["html", "htm"]);
export const isHTML = (ext) => html.has(ext);

// what to render in markdown -- rmd is special, but it's ok to show it that way for now
const md = new Set(["md", "rmd"]);
export const isMarkdown = (ext) => md.has(ext);

const codemirror = {};
for (const ext in file_associations) {
  const info = file_associations[ext];
  if (info && (info.editor === "codemirror" || info.editor === "latex")) {
    codemirror[ext] = { mode: { name: info.opts.mode } };
  }
}
export const isCodemirror = (ext) => !!codemirror[ext];

export function hasViewer(ext: string): boolean {
  return (
    hasSpecialViewer(ext) ||
    isImage(ext) ||
    isVideo(ext) ||
    isAudio(ext) ||
    isPDF(ext)
  );
}

// If the viewer isn't specified, definitely, always default
// raw for these file types.
export function defaultToRaw(ext: string): boolean {
  if (ext === "css" || ext == "js") return true;
  return false;
}

// Has a special viewer -- not the sort of file that could
// just be embedded via html (e.g., NOT an image).
export function hasSpecialViewer(ext: string): boolean {
  return (
    ext === "ipynb" ||
    ext === "sagews" ||
    isMarkdown(ext) ||
    isCodemirror(ext) ||
    isHTML(ext)
  );
}

// Is the actual content used in rendering files with the given extension.
export function needsContent(ext: string): boolean {
  return !(image[ext] || pdf[ext] || video[ext]);
}
