import type { Employee } from "@/types";

export type CxoType = "cfo" | "coo" | "cto" | "cxo" | null;

export interface OrgTreeNode {
  emp: Employee;
  /** Legacy flag kept for compatibility with existing tree-rendering code: true for a CEO root card. */
  isAdmin?: boolean;
  isCeo?: boolean;
  isCxo?: boolean;
  cxoType?: CxoType;
  /** Neutral placeholder root used when there is no single CEO to anchor the tree (zero or multiple CEO records). */
  isOrgRoot?: boolean;
  /** Synthetic grouping node for employees whose manager reference is broken, or who sit in a reporting cycle. */
  isUnassignedGroup?: boolean;
  children: OrgTreeNode[];
}

export interface BuildOrgTreeResult {
  root: OrgTreeNode | null;
  ceoCount: number;
  /** Employees whose reportingManagerId points at someone not in the roster, or who sit in an unreachable cycle. */
  unassignedCount: number;
  cyclicCount: number;
}

// Synthetic ids for placeholder nodes — negative so they can never collide
// with a real employee id.
const ORG_ROOT_ID = -1;
const UNASSIGNED_GROUP_ID = -2;

function getMgrId(e: Employee): number | null {
  const val = (e as any).reportingManagerId ?? (e as any).reporting_manager_id;
  return val !== null && val !== undefined && val !== "" ? Number(val) : null;
}

function isCeoFlag(e: any): boolean {
  const isCeo = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
  const role = ((e.accessRole || e.role || "") as string).toLowerCase().trim();
  const desig = (e.designation || e.jobTitle || e.designationName || "").toLowerCase().trim();
  return isCeo || role === "ceo" || desig === "ceo" || desig === "chief executive officer";
}

function getCxoCategory(e: Employee): CxoType {
  const role = ((e as any).accessRole || (e as any).role || "").toLowerCase().trim();
  const desig = (
    e.designation ||
    (e as any).jobTitle ||
    (e as any).designationName ||
    (e as any).designation_name ||
    ""
  )
    .toLowerCase()
    .trim();

  if (
    role === "cfo" ||
    desig === "cfo" ||
    desig.includes("chief financial") ||
    desig.includes("finance head") ||
    desig.includes("director of finance")
  )
    return "cfo";
  if (
    role === "coo" ||
    desig === "coo" ||
    desig.includes("chief operating") ||
    desig.includes("chief operations") ||
    desig.includes("operations head")
  )
    return "coo";
  if (
    role === "cto" ||
    desig === "cto" ||
    desig.includes("chief tech") ||
    desig.includes("chief technology") ||
    desig.includes("tech head") ||
    desig.includes("head of engineering") ||
    desig.includes("director of engineering")
  )
    return "cto";
  if (
    role === "cxo" ||
    desig.startsWith("chief ") ||
    desig.includes("c-level") ||
    desig === "cmo" ||
    desig === "cio" ||
    desig === "cpo" ||
    desig === "cro" ||
    desig === "cso"
  )
    return "cxo";
  return null;
}

function makeOrgRootPlaceholder(): Employee {
  return {
    id: ORG_ROOT_ID,
    firstName: "Organization",
    lastName: "",
    email: "",
    employeeCode: "ORG-ROOT",
    designation: "Organization",
    department: "",
  };
}

function makeUnassignedPlaceholder(count: number): Employee {
  return {
    id: UNASSIGNED_GROUP_ID,
    firstName: "Unassigned",
    lastName: "",
    email: "",
    employeeCode: "UNASSIGNED",
    designation: `${count} record${count === 1 ? "" : "s"} need review`,
    department: "",
  };
}

/**
 * Builds the Org Chart tree in O(n): one pass indexes every employee by
 * their manager id, then a single iterative (non-recursive, so a
 * pathologically deep or wide org can't overflow the call stack) descent
 * assembles the tree from that index — replacing the previous approach of
 * re-scanning the full employee list once per node (O(n^2)).
 *
 * Reporting-manager conventions preserved exactly as before:
 *  - An employee with NO manager (`reportingManagerId` null) is the
 *    existing app-wide convention for "reports directly to the CEO/root" —
 *    this is what drag-and-drop onto the CEO card writes. Such employees
 *    attach as direct children of the resolved root, unchanged.
 *  - Only genuine anomalies are called out separately: a manager id that
 *    doesn't resolve to anyone in the roster (orphaned reference), or an
 *    employee stuck in a reporting cycle with no path back to a real root.
 *    Those are grouped under a visible "Unassigned" node instead of being
 *    silently merged into someone's children or dropped entirely.
 */
export function buildOrgTree(rawList: Employee[]): BuildOrgTreeResult {
  if (!rawList || rawList.length === 0) {
    return { root: null, ceoCount: 0, unassignedCount: 0, cyclicCount: 0 };
  }

  const byId = new Map<number, Employee>();
  for (const e of rawList) {
    if (e.id !== undefined && e.id !== null) byId.set(Number(e.id), e);
  }

  const ceoEmployees = rawList.filter((e) => isCeoFlag(e));
  const ceoIds = new Set(ceoEmployees.map((e) => Number(e.id)));

  const childrenByManager = new Map<number, Employee[]>();
  const nullManagerEmployees: Employee[] = [];
  const orphanedManagerEmployees: Employee[] = [];

  for (const e of rawList) {
    if (ceoIds.has(Number(e.id))) continue; // CEOs are roots, never children
    const mgrId = getMgrId(e);
    if (mgrId === null) {
      nullManagerEmployees.push(e);
      continue;
    }
    if (!byId.has(mgrId) && !ceoIds.has(mgrId)) {
      orphanedManagerEmployees.push(e);
      continue;
    }
    const list = childrenByManager.get(mgrId);
    if (list) list.push(e);
    else childrenByManager.set(mgrId, [e]);
  }

  // Ids that are indexed as *someone's* child (i.e. have a manager id that
  // resolves to a real employee/CEO) — used afterwards to detect reporting
  // cycles that never connect back to a real root.
  const indexedChildIds = new Set<number>();
  childrenByManager.forEach((list) => list.forEach((e) => indexedChildIds.add(Number(e.id))));

  function buildFrom(
    rootEmp: Employee,
    flags: Partial<OrgTreeNode>,
    onVisit?: (id: number) => void,
  ): OrgTreeNode {
    const rootNode: OrgTreeNode = { emp: rootEmp, children: [], ...flags };
    const visited = new Set<number>([Number(rootEmp.id)]);
    const stack: Array<{ node: OrgTreeNode; emp: Employee }> = [{ node: rootNode, emp: rootEmp }];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const kids = childrenByManager.get(Number(current.emp.id)) || [];
      for (const kid of kids) {
        const kidId = Number(kid.id);
        if (visited.has(kidId)) continue; // guards against a cycle looping back into this same subtree
        visited.add(kidId);
        indexedChildIds.delete(kidId);
        onVisit?.(kidId);
        const cat = getCxoCategory(kid);
        const kidNode: OrgTreeNode = { emp: kid, isCxo: cat !== null, cxoType: cat, children: [] };
        current.node.children.push(kidNode);
        stack.push({ node: kidNode, emp: kid });
      }
    }
    return rootNode;
  }

  const ceoCount = ceoEmployees.length;
  let root: OrgTreeNode;

  if (ceoCount === 1) {
    root = buildFrom(ceoEmployees[0], { isAdmin: true, isCeo: true });
    // Existing convention: no manager assigned == reports directly to the CEO.
    for (const e of nullManagerEmployees) {
      root.children.push(buildFrom(e, {}));
    }
  } else {
    root = { emp: makeOrgRootPlaceholder(), isOrgRoot: true, children: [] };
    for (const ceo of ceoEmployees) {
      root.children.push(buildFrom(ceo, { isAdmin: true, isCeo: true }));
    }
    // No single CEO to anchor "reports to the CEO" employees under — attach
    // them at the top level instead of guessing which CEO they belong to.
    for (const e of nullManagerEmployees) {
      root.children.push(buildFrom(e, {}));
    }
  }

  // Anything still marked as "indexed" after descending from every real
  // root was reachable only from other unreached nodes — i.e. it's part of
  // a reporting cycle disconnected from the actual hierarchy.
  const cyclic: Employee[] = [];
  indexedChildIds.forEach((id) => {
    const e = byId.get(id);
    if (e) cyclic.push(e);
  });

  const unassignedAll = [...orphanedManagerEmployees, ...cyclic];
  if (unassignedAll.length > 0) {
    const attachedAsDescendant = new Set<number>();
    const unassignedChildren: OrgTreeNode[] = [];
    for (const e of unassignedAll) {
      const eId = Number(e.id);
      if (attachedAsDescendant.has(eId)) continue; // already nested under an earlier sibling in this group
      unassignedChildren.push(buildFrom(e, {}, (id) => attachedAsDescendant.add(id)));
    }
    root.children.push({
      emp: makeUnassignedPlaceholder(unassignedAll.length),
      isUnassignedGroup: true,
      children: unassignedChildren,
    });
  }

  return {
    root,
    ceoCount,
    unassignedCount: orphanedManagerEmployees.length,
    cyclicCount: cyclic.length,
  };
}
