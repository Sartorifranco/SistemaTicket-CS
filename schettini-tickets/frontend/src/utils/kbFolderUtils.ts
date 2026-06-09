export interface KbFolderNode {
    id: number;
    name: string;
    parent_id: number | null;
}

export interface FolderSelectOption {
    id: number | null;
    label: string;
}

/** IDs de la carpeta y todas sus subcarpetas (para excluir destinos inválidos al mover). */
export function getFolderDescendantIds(folderId: number, allFolders: KbFolderNode[]): Set<number> {
    const blocked = new Set<number>([folderId]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const f of allFolders) {
            if (f.parent_id != null && blocked.has(f.parent_id) && !blocked.has(f.id)) {
                blocked.add(f.id);
                changed = true;
            }
        }
    }
    return blocked;
}

/** Opciones jerárquicas para mover carpetas o recursos (Inicio + árbol con sangría). */
export function buildFolderSelectOptions(
    allFolders: KbFolderNode[],
    excludeIds?: Set<number>
): FolderSelectOption[] {
    const options: FolderSelectOption[] = [{ id: null, label: 'Inicio (raíz)' }];
    const visible = allFolders.filter(f => !excludeIds?.has(f.id));
    const byParent = new Map<number | null, KbFolderNode[]>();

    for (const f of visible) {
        const key = f.parent_id;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(f);
    }

    const walk = (parentId: number | null, depth: number) => {
        const children = (byParent.get(parentId) || []).sort((a, b) =>
            a.name.localeCompare(b.name, 'es')
        );
        for (const c of children) {
            options.push({
                id: c.id,
                label: `${depth > 0 ? '— '.repeat(depth) : ''}${c.name}`,
            });
            walk(c.id, depth + 1);
        }
    };

    walk(null, 0);
    return options;
}
