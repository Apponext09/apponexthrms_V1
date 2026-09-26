export interface RoleMenuItem {
  id: number;
  parentId: number | null;
  code: string;
  label: string;
  route?: string | null;
  portal?: string | null;
  children?: RoleMenuItem[];
}

export function flattenMenus(items: RoleMenuItem[]): RoleMenuItem[] {
  return items.flatMap((item) => [item, ...flattenMenus(item.children ?? [])]);
}

export function menuDescendantIds(items: RoleMenuItem[], parentId: number): number[] {
  const descendants: number[] = [];
  const visit = (id: number) => {
    for (const item of items.filter((entry) => entry.parentId === id)) {
      descendants.push(item.id);
      visit(item.id);
    }
  };
  visit(parentId);
  return descendants;
}

export function toggleMenu(items: RoleMenuItem[], current: number[], id: number, checked: boolean): number[] {
  const selected = new Set(current);
  if (checked) {
    selected.add(id);
    let parentId = items.find((item) => item.id === id)?.parentId;
    while (parentId != null) {
      selected.add(parentId);
      parentId = items.find((item) => item.id === parentId)?.parentId;
    }
  } else {
    selected.delete(id);
    for (const descendantId of menuDescendantIds(items, id)) selected.delete(descendantId);
  }
  return [...selected].sort((a, b) => a - b);
}

export function selectMenuChildren(items: RoleMenuItem[], current: number[], parentId: number): number[] {
  const selected = new Set(toggleMenu(items, current, parentId, true));
  for (const childId of menuDescendantIds(items, parentId)) selected.add(childId);
  return [...selected].sort((a, b) => a - b);
}
