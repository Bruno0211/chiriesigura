/** The phone pages' stroke family: 20px box, 2px round strokes, currentColor. Built node by node (no innerHTML). */
const SVG_NS = 'http://www.w3.org/2000/svg';

type Shape = [tag: 'path' | 'circle' | 'rect', attrs: Record<string, string>];

const SHAPES = {
  check: [['path', { d: 'M4.5 10.5l3.5 3.5 7.5-8' }]],
  cross: [['path', { d: 'M5.5 5.5l9 9M14.5 5.5l-9 9' }]],
  alert: [['path', { d: 'M10 4.5v7M10 15.25v.25' }]],
  // Busy only: the "Checking this listing…" spinner.
  pending: [['circle', { cx: '10', cy: '10', r: '6.5', 'stroke-dasharray': '3 3.2' }]],
  // Nothing to vouch for (unverified): a closed ring with a dash, never the spinner.
  ringDash: [
    ['circle', { cx: '10', cy: '10', r: '6.5' }],
    ['path', { d: 'M7 10h6' }],
  ],
  chevron: [['path', { d: 'M5.5 8l4.5 4.5L14.5 8' }]],
  copy: [
    ['rect', { x: '7', y: '7', width: '9.5', height: '9.5', rx: '1.5' }],
    ['path', { d: 'M13 4.5v-.1A1.4 1.4 0 0011.6 3H4.4A1.4 1.4 0 003 4.4v7.2A1.4 1.4 0 004.4 13h.1' }],
  ],
  arrow: [['path', { d: 'M4 10h11.5M11 5.5l4.5 4.5-4.5 4.5' }]],
  retry: [['path', { d: 'M15.5 10a5.5 5.5 0 11-1.6-3.9M15.5 3.5v3.2h-3.2' }]],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof SHAPES;

export function icon(doc: Document, name: IconName, className?: string): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  const attrs: Record<string, string> = {
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
  if (className) svg.setAttribute('class', className);
  for (const [tag, a] of SHAPES[name] as Shape[]) {
    const el = doc.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(a)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}
