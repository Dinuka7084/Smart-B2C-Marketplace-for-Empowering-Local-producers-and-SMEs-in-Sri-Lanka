import type { SessionUser, UserRole } from '@/lib/api';

export const dashboardPathFor = (user: Pick<SessionUser, 'role'>): string => {
  const paths: Record<UserRole, string> = {
    customer: '/account',
    vendor: '/vendor',
    admin: '/admin',
  };

  return paths[user.role];
};
