import { describe, expect, it } from 'vitest';
import { selectMenuChildren, toggleMenu, type RoleMenuItem } from './roleMenuSelection';

const menus: RoleMenuItem[] = [
  { id: 1, parentId: null, code: 'attendance', label: 'Attendance' },
  { id: 2, parentId: 1, code: 'my_attendance', label: 'My Attendance' },
  { id: 3, parentId: 1, code: 'live_tracking', label: 'Live Tracking' },
];

describe('role menu selection', () => {
  it('selects only the parent when the parent is checked', () => {
    expect(toggleMenu(menus, [], 1, true)).toEqual([1]);
  });

  it('automatically selects the parent when a child is checked', () => {
    expect(toggleMenu(menus, [], 2, true)).toEqual([1, 2]);
  });

  it('does not select sibling pages', () => {
    expect(toggleMenu(menus, [], 2, true)).not.toContain(3);
  });

  it('clears all children when the parent is unchecked', () => {
    expect(toggleMenu(menus, [1, 2, 3], 1, false)).toEqual([]);
  });

  it('supports an explicit select-all action', () => {
    expect(selectMenuChildren(menus, [], 1)).toEqual([1, 2, 3]);
  });
});
