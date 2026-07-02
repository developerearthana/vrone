// Single source of truth for "which dashboard does this role land on" —
// shared by the login redirect and the breadcrumb's "Dashboards" link so a
// clicked breadcrumb never points at a route that doesn't exist.
export function getRoleDashboardHref(role?: string | null): string {
    if (role === 'vendor') return '/dashboards/vendor';
    if (role === 'customer') return '/dashboards/customer';
    if (role === 'manager') return '/dashboards/manager';
    if (role === 'staff' || role === 'user' || role === 'employee') return '/dashboards/employee';
    if (role === 'super-admin' || role === 'admin') return '/dashboards/super-admin';
    return '/dashboards/employee';
}
