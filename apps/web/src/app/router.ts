export const appRoutes = {
  home: '/',
  auth: '/auth',
  chats: '/chats',
  profile: '/profile',
  settings: '/settings',
  privacy: '/privacy',
  security: '/security',
  notifications: '/notifications',
  media: '/media',
  search: '/search',
  calls: '/calls',
  ai: '/ai',
  groups: '/groups',
  messages: '/messages',
  folders: '/folders',
  saved: '/saved',
  commandCenter: '/command-center'
} as const;

export type AppRoute = keyof typeof appRoutes;
export const routeFor = (route: AppRoute) => appRoutes[route];
