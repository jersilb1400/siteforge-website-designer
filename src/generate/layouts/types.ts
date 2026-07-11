import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';

export interface LayoutRenderer {
  /** Full home page content: hero + all home section bands. */
  homeContent(spec: SiteSpec, theme: Theme): string;
  /** Services inner page content (replaces shared servicesPage). */
  servicesContent(spec: SiteSpec, theme: Theme): string;
}
