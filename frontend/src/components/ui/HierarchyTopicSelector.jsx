import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';

const asList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const isIbCurriculum = (curriculum) => {
  const s = String(curriculum?.slug || curriculum?.name || '').toLowerCase();
  return s === 'ib' || s.includes(' ib ') || s.startsWith('ib-') || s.endsWith('-ib') || s.includes('international baccalaureate');
};

const flattenTree = (roots) => {
  const byId = new Map();
  const parentById = new Map();

  const walk = (node, parentId) => {
    if (!node || typeof node !== 'object') return;
    byId.set(String(node.id), node);
    parentById.set(String(node.id), parentId ? String(parentId) : null);
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) walk(child, node.id);
  };

  for (const r of roots || []) walk(r, null);
  return { byId, parentById };
};

const computePathIds = (topicId, parentById) => {
  if (!topicId) return [];
  const ids = [];
  let cur = String(topicId);
  let guard = 0;
  while (cur && guard < 50) {
    ids.unshift(cur);
    cur = parentById.get(cur);
    guard += 1;
  }
  return ids;
};

const labelFromPath = (pathIds, byId) => {
  const parts = [];
  for (const id of pathIds) {
    const n = byId.get(String(id));
    if (n?.name) parts.push(n.name);
  }
  return parts.join(' → ');
};

/**
 * Hierarchical topic selector
 * - Data source: GET curriculums/ + GET curriculums/:id/tree/
 * - Output: selected topic id (deepest selection)
 */
export default function HierarchyTopicSelector({
  value,
  onChange,
  onMetaChange,
  required = false,
  className = '',
  selectClassName = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all',
  labelClassName = 'block text-sm font-semibold text-gray-300 mb-2',
}) {
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [treeRoots, setTreeRoots] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);

  const skipClearOnCurriculumChangeRef = useRef(false);
  const initialCurriculumLoadRef = useRef(true);

  // selections represent the chosen node at each depth level (root->leaf)
  const [selections, setSelections] = useState([]); // array of string ids

  const { byId, parentById } = useMemo(() => flattenTree(treeRoots), [treeRoots]);

  // If a topic is already selected (edit flow) but the current curriculum tree
  // doesn't contain it, auto-detect the correct curriculum and switch.
  useEffect(() => {
    const topicId = value ? String(value) : '';
    if (!topicId) return;
    if (byId.has(topicId)) return;

    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`topics/${topicId}/`);
        const curriculumId = res?.data?.curriculum;
        if (!mounted) return;
        if (curriculumId != null && String(curriculumId) && String(curriculumId) !== String(selectedCurriculumId)) {
          skipClearOnCurriculumChangeRef.current = true;
          setSelectedCurriculumId(String(curriculumId));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [value, byId, selectedCurriculumId]);

  // Derive current selection path from controlled value if possible
  useEffect(() => {
    if (!value) return;
    const topicId = String(value);
    if (!byId.has(topicId)) return;
    const path = computePathIds(topicId, parentById);
    if (path.length) setSelections(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, byId]);

  // Fetch curriculums
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('curriculums/');
        const list = asList(res.data);
        if (!mounted) return;
        setCurriculums(list);
        if (!selectedCurriculumId && list.length) {
          setSelectedCurriculumId(String(list[0].id));
        }
      } catch {
        if (!mounted) return;
        setCurriculums([]);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch curriculum tree whenever curriculum changes
  useEffect(() => {
    if (!selectedCurriculumId) {
      setTreeRoots([]);
      return;
    }

    let mounted = true;
    setTreeLoading(true);
    (async () => {
      try {
        const res = await api.get(`curriculums/${selectedCurriculumId}/tree/`);
        const roots = res.data?.roots || [];
        if (!mounted) return;
        setTreeRoots(Array.isArray(roots) ? roots : []);
      } catch {
        if (!mounted) return;
        setTreeRoots([]);
      } finally {
        if (mounted) setTreeLoading(false);
      }
    })();

    // Reset selection path on curriculum change.
    // Important: during edit flows, a controlled `value` may already be set. We must not
    // eagerly clear it on the very first curriculum load, otherwise the parent loses
    // the topic id before we can auto-detect the correct curriculum.
    const isInitialLoad = initialCurriculumLoadRef.current;
    if (isInitialLoad) initialCurriculumLoadRef.current = false;

    if (skipClearOnCurriculumChangeRef.current) {
      skipClearOnCurriculumChangeRef.current = false;
    } else if (!(isInitialLoad && value)) {
      setSelections([]);
      onChange?.('');
    }
    onMetaChange?.({
      curriculumId: selectedCurriculumId,
      curriculum: curriculums.find((c) => String(c.id) === String(selectedCurriculumId)) || null,
      isIb: isIbCurriculum(curriculums.find((c) => String(c.id) === String(selectedCurriculumId))),
      pathLabel: '',
      isComplete: false,
    });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurriculumId]);

  const selectedCurriculum = useMemo(
    () => curriculums.find((c) => String(c.id) === String(selectedCurriculumId)) || null,
    [curriculums, selectedCurriculumId]
  );

  const pathLabel = useMemo(() => labelFromPath(selections, byId), [selections, byId]);

  const childrenFor = (nodeIdOrNull) => {
    if (!nodeIdOrNull) return treeRoots;
    const node = byId.get(String(nodeIdOrNull));
    return Array.isArray(node?.children) ? node.children : [];
  };

  const levels = useMemo(() => {
    const out = [];
    // Level 0: roots (subjects)
    out.push({
      label: 'Subject',
      options: childrenFor(null),
      selectedId: selections[0] || '',
    });

    // Level 1+: each depends on previous selection
    for (let i = 0; i < 4; i++) {
      const parentId = selections[i] || '';
      if (!parentId) break;
      const options = childrenFor(parentId);
      if (!options.length) break;
      const label = i === 0 ? 'Category' : i === 1 ? 'Topic' : i === 2 ? 'Subtopic' : 'Subtopic';
      out.push({
        label,
        options,
        selectedId: selections[i + 1] || '',
      });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeRoots, selections, byId]);

  const selectedTopicId = selections.length ? selections[selections.length - 1] : '';

  const isComplete = useMemo(() => {
    if (!selectedTopicId) return false;
    const node = byId.get(String(selectedTopicId));
    const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
    return !hasChildren;
  }, [byId, selectedTopicId]);

  useEffect(() => {
    onMetaChange?.({
      curriculumId: selectedCurriculumId,
      curriculum: selectedCurriculum,
      isIb: isIbCurriculum(selectedCurriculum),
      pathLabel,
      isComplete,
    });
  }, [selectedCurriculumId, selectedCurriculum, pathLabel, isComplete, onMetaChange]);

  const handleLevelChange = (levelIndex, newId) => {
    const next = selections.slice(0, levelIndex);
    if (newId) next.push(String(newId));
    setSelections(next);

    // propagate topic id (deepest selected)
    const newTopicId = next.length ? next[next.length - 1] : '';
    onChange?.(newTopicId);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClassName}>Curriculum {required ? '*' : ''}</label>
          <select
            value={selectedCurriculumId}
            onChange={(e) => setSelectedCurriculumId(e.target.value)}
            className={selectClassName}
            required={required}
            aria-label="Select curriculum"
          >
            {curriculums.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
            {curriculums.length === 0 && (
              <option value="">No curriculums</option>
            )}
          </select>
        </div>

        {levels.map((lvl, idx) => (
          <div key={lvl.label + idx}>
            <label className={labelClassName}>{lvl.label} {required ? '*' : ''}</label>
            <select
              value={lvl.selectedId}
              onChange={(e) => handleLevelChange(idx, e.target.value)}
              className={selectClassName}
              required={required && idx === 0}
              disabled={treeLoading || !lvl.options.length}
              aria-label={`Select ${lvl.label}`}
            >
              <option value="">Select {lvl.label.toLowerCase()}</option>
              {lvl.options.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.name}</option>
              ))}
            </select>
          </div>
        ))}

        <div className="md:col-span-2">
          <div className="text-xs text-gray-400">
            Selected: <span className="text-gray-200">{pathLabel || '—'}</span>
            {!treeLoading && selectedTopicId && !isComplete && (
              <span className="ml-2 text-amber-300">(select a deeper sub-topic)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
