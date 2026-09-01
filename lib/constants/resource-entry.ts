import { UTM_SOURCE } from './navigation';

export const FLAQ_SITE_URL = 'https://flaq.ai';

export function getFlaqResourceUrl(path: string) {
  return `${FLAQ_SITE_URL}${path}?utm_source=${UTM_SOURCE}`;
}
