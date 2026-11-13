import QRCode from 'qrcode';

/** Light border, in modules, that scanners need around the code. */
export const QUIET = 4;

/** One path of 1×1 squares, a module per dark cell, in a viewBox of `size` modules. */
export function qrPath(text: string): { size: number; d: string } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  let d = '';
  for (let row = 0; row < modules.size; row++)
    for (let col = 0; col < modules.size; col++)
      if (modules.get(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
  return { size: modules.size + 2 * QUIET, d };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An inline SVG (not a data: image, which a listing site's CSP can block), labelled for screen readers. */
export function qrSvg(doc: Document, text: string, label: string): SVGSVGElement {
  const { size, d } = qrPath(text);
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = doc.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(size));
  bg.setAttribute('height', String(size));
  bg.setAttribute('fill', '#ffffff');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#15132b');
  svg.append(bg, path);
  return svg;
}
