import { DmStatus } from './types';

export type Route =
  | { view: 'dashboard' }
  | { view: 'logs'; status: 'all' | DmStatus }
  | { view: 'project'; projectId: string };

const VALID_STATUSES: DmStatus[] = ['waiting', 'list_up', 'in_talks', 'confirmed', 'rejected'];

export function parseRoute(): Route {
  const { pathname, search } = window.location;

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/?$/);
  if (projectMatch) return { view: 'project', projectId: decodeURIComponent(projectMatch[1]) };

  if (pathname === '/logs') {
    const status = new URLSearchParams(search).get('status');
    return { view: 'logs', status: VALID_STATUSES.includes(status as DmStatus) ? (status as DmStatus) : 'all' };
  }

  return { view: 'dashboard' };
}

export function routeToUrl(route: Route): string {
  if (route.view === 'project') return `/projects/${encodeURIComponent(route.projectId)}`;
  if (route.view === 'logs') return route.status === 'all' ? '/logs' : `/logs?status=${route.status}`;
  return '/';
}

export function pushRoute(route: Route) {
  const url = routeToUrl(route);
  if (url !== window.location.pathname + window.location.search) {
    window.history.pushState(null, '', url);
  }
}
