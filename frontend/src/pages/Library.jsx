import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

import api from '../services/api';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

function TreeNode({ node, level, expanded, onToggle, onSelect, selectedId }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = String(selectedId) === String(node.id);
  const rowRef = useRef(null);

  useEffect(() => {
    if (!isSelected) return;
    // Keep navigation feeling like a file explorer: selection stays visible.
    rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);

  return (
    <div>
      <div
        ref={rowRef}
        className={
          `w-full flex items-center gap-2 rounded-xl pr-3 py-2 text-left transition-colors ` +
          (isSelected
            ? 'bg-elevated text-text ring-1 ring-white/10'
            : 'text-text-secondary hover:text-text hover:bg-surface ring-1 ring-transparent')
        }
        style={{ paddingLeft: `${12 + level * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/5 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-7 h-7 shrink-0" />
        )}

        <button
          type="button"
          aria-current={isSelected ? 'true' : undefined}
          onClick={() => {
            onSelect(node);
            if (hasChildren && !isExpanded) onToggle(node.id);
          }}
          className="min-w-0 flex-1 flex items-center gap-2 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate font-semibold">{node.name}</span>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Library() {
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');

  const [treeLoading, setTreeLoading] = useState(true);
  const [treeRoots, setTreeRoots] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);

  const [examsLoading, setExamsLoading] = useState(false);
  const [exams, setExams] = useState([]);

  const didLoadCurriculumsRef = useRef(false);

  useEffect(() => {
    if (didLoadCurriculumsRef.current) return;
    didLoadCurriculumsRef.current = true;

    (async () => {
      try {
        const res = await api.getCurriculums();
        const data = res?.data;
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setCurriculums(list);
        if (list.length > 0) setSelectedCurriculumId(String(list[0].id));
      } catch (err) {
        console.error('Failed to load curriculums:', err);
        setCurriculums([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCurriculumId) return;

    (async () => {
      setTreeLoading(true);
      setTreeRoots([]);
      setExpanded(new Set());
      setSelectedNode(null);
      setExams([]);
      try {
        const res = await api.getCurriculumTree(selectedCurriculumId);
        const roots = res?.data?.roots;
        setTreeRoots(Array.isArray(roots) ? roots : []);
      } catch (err) {
        console.error('Failed to load curriculum tree:', err);
        setTreeRoots([]);
      } finally {
        setTreeLoading(false);
      }
    })();
  }, [selectedCurriculumId]);

  const onToggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getPathToNode = (nodeId) => {
    const targetId = String(nodeId);

    const walk = (nodes, path) => {
      for (const node of nodes) {
        const nextPath = [...path, node];
        if (String(node.id) === targetId) return nextPath;
        if (Array.isArray(node.children) && node.children.length > 0) {
          const found = walk(node.children, nextPath);
          if (found) return found;
        }
      }
      return null;
    };

    return walk(treeRoots, []) || [];
  };

  const onSelect = async (node) => {
    setSelectedNode(node);

    // Expand the full path so the selection is always visible.
    const path = getPathToNode(node.id);
    if (path.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        // Expand only nodes that actually have children.
        for (const p of path) {
          if (Array.isArray(p.children) && p.children.length > 0) next.add(p.id);
        }
        return next;
      });
    }

    setExamsLoading(true);
    try {
      const res = await api.get('exams/', { params: { topic: node.id } });
      const data = res?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setExams(list);
    } catch (err) {
      console.error('Failed to load exams for topic:', err);
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  };

  const curriculumOptions = useMemo(() => {
    return curriculums.map((c) => ({ id: String(c.id), name: c.name }));
  }, [curriculums]);

  const selectedPath = useMemo(() => {
    if (!selectedNode?.id) return [];
    const targetId = String(selectedNode.id);

    const walk = (nodes, path) => {
      for (const node of nodes) {
        const nextPath = [...path, node];
        if (String(node.id) === targetId) return nextPath;
        if (Array.isArray(node.children) && node.children.length > 0) {
          const found = walk(node.children, nextPath);
          if (found) return found;
        }
      }
      return null;
    };

    return walk(treeRoots, []) || [];
  }, [selectedNode?.id, treeRoots]);

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="Library"
      nav={<StudentNav active="library" />}
      right={(
        <Link to="/dashboard" className="btn-secondary text-sm">
          Back
        </Link>
      )}
    >
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Curriculum Library</h1>
          <p className="text-text-secondary">Browse folders → pick a topic → start a test.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary">Curriculum</label>
          <select
            className="input"
            value={selectedCurriculumId}
            onChange={(e) => setSelectedCurriculumId(e.target.value)}
            disabled={curriculumOptions.length === 0}
          >
            {curriculumOptions.length === 0 ? (
              <option value="">No curriculums</option>
            ) : (
              curriculumOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="card-elevated lg:col-span-1 lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-text">Folders</div>
              <div className="text-xs text-text-secondary">Use the arrow to expand/collapse</div>
            </div>
          </div>

          {treeLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-5/6" />
              <Skeleton className="h-10 w-4/6" />
            </div>
          ) : treeRoots.length === 0 ? (
            <EmptyState
              icon={<Folder className="w-6 h-6 text-primary" />}
              title="No topics"
              description="Ask admin to create curriculum topics."
              action={<Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>}
            />
          ) : (
            <div className="space-y-1 max-h-[70vh] lg:max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              {treeRoots.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  level={0}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  selectedId={selectedNode?.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card-elevated">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="text-sm text-text-secondary">Selected folder</div>
                <div className="text-lg font-bold text-text truncate">{selectedNode?.name || '—'}</div>
                {selectedPath.length > 1 && (
                  <div className="mt-1 text-xs text-text-secondary truncate">
                    {selectedPath.map((n) => n.name).join(' / ')}
                  </div>
                )}
              </div>
              {selectedNode && !examsLoading && (
                <div className="text-sm text-text-secondary shrink-0">{exams.length} test(s)</div>
              )}
            </div>

            <div className="max-h-[70vh] lg:max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              {examsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card-elevated space-y-3">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-28" />
                  </div>
                  <div className="card-elevated space-y-3">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-28" />
                  </div>
                </div>
              ) : !selectedNode ? (
                <EmptyState
                  icon={<BookOpen className="w-6 h-6 text-primary" />}
                  title="Open a folder"
                  description="Select a topic/subtopic to see available tests."
                  action={<Link to="/exams" className="btn-primary">View All Tests</Link>}
                />
              ) : exams.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="w-6 h-6 text-primary" />}
                  title="No tests in this folder"
                  description="Ask your teacher or admin to publish exams for this topic."
                  action={<Link to="/exams" className="btn-primary">View All Tests</Link>}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {exams.map((exam) => (
                    <div key={exam.id} className="card-elevated">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-lg font-bold text-text truncate">{exam.title}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="px-2 py-1 rounded-lg bg-surface text-xs text-text-secondary">
                              {exam.level ? `${exam.level}` : 'Level: —'}
                            </span>
                            <span className="px-2 py-1 rounded-lg bg-surface text-xs text-text-secondary">
                              {exam.paper_number ? `Paper ${exam.paper_number}` : 'Paper: —'}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/test/${exam.id}`}
                          className="btn-primary text-sm inline-flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                        >
                          Start
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default Library;
