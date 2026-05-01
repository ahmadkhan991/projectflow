import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO, isAfter } from 'date-fns';
import {
  Plus, X, Users, LayoutGrid, List, Settings, Trash2, MessageSquare,
  Calendar, ChevronDown, Search, Filter, Loader2, AlertTriangle, ArrowLeft, Edit2, UserPlus
} from 'lucide-react';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const STATUS_COLORS = { todo: '#6366f1', in_progress: '#fbbf24', review: '#a78bfa', done: '#4ade80' };
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS = { critical: '#ff6b7a', high: '#fb923c', medium: '#fbbf24', low: '#4ade80' };

function Avatar({ name, color, size = 'sm' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return <div className={`avatar avatar-${size}`} style={{ background: color || '#6366f1' }}>{initials}</div>;
}

function TaskCard({ task, members, projectRole, onUpdate, onDelete, onClick }) {
  const isOverdue = task.due_date && isAfter(new Date(), parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div className="kanban-card" onClick={() => onClick(task)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <span className={`badge badge-${task.priority}`} style={{ fontSize: 10 }}>{task.priority}</span>
        {isOverdue && <span style={{ fontSize: 10, color: '#f87171', display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={10} /> Overdue</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 10 }}>{task.title}</div>
      {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</div>}
      {task.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {task.tags.slice(0, 3).map(tag => <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>#{tag}</span>)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.assignee_id ? <Avatar name={task.assignee_name} color={task.assignee_color} size="sm" /> : <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed var(--border)' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          {task.comment_count > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MessageSquare size={11} /> {task.comment_count}</span>}
          {task.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: isOverdue ? '#f87171' : 'inherit' }}><Calendar size={11} /> {format(parseISO(task.due_date), 'MMM d')}</span>}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, members, projectRole, onClose, onUpdate, onDelete }) {
  const { user } = useAuth();
  const { projectId } = useParams();
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    status: task?.status || 'todo', priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '', due_date: task?.due_date || '',
    estimated_hours: task?.estimated_hours || '', tags: task?.tags?.join(', ') || ''
  });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const isNew = !task?.id;

  useEffect(() => {
    if (task?.id) {
      api.get(`/projects/${projectId}/tasks/${task.id}`).then(r => setComments(r.data.comments || []));
    }
  }, [task?.id, projectId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      if (isNew) {
        const res = await api.post(`/projects/${projectId}/tasks`, payload);
        onUpdate(res.data.task, true);
        toast.success('Task created!');
      } else {
        const res = await api.patch(`/projects/${projectId}/tasks/${task.id}`, payload);
        onUpdate(res.data.task, false);
        toast.success('Task updated!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save task');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${task.id}`);
      onDelete(task.id);
      toast.success('Task deleted');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: newComment });
      setComments(c => [...c, res.data.comment]);
      setNewComment('');
    } catch (err) { toast.error('Failed to post comment'); }
    finally { setCommentLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl">
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{isNew ? 'New Task' : 'Edit Task'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isNew && (projectRole === 'admin' || task.reporter_id === user?.id) && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={13} /></button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}><X size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
            <div>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input type="text" placeholder="What needs to be done?" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={4} placeholder="Add details, steps, or context..." style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input type="text" placeholder="e.g. frontend, bug, v2" value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} />
              </div>

              {!isNew && (
                <div>
                  <div className="divider" />
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} /> Comments ({comments.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                        <Avatar name={c.user_name} color={c.avatar_color} size="sm" />
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.user_name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" placeholder="Write a comment..." value={newComment} onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()} />
                    <button className="btn btn-primary btn-sm" onClick={handleComment} disabled={commentLoading || !newComment.trim()} style={{ whiteSpace: 'nowrap' }}>
                      {commentLoading ? <Loader2 size={12} className="spin" /> : 'Post'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assignee</label>
                <select value={form.assignee_id} onChange={e => setForm(p => ({...p, assignee_id: e.target.value}))}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Due date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Estimated hours</label>
                <input type="number" min="0" step="0.5" placeholder="e.g. 4" value={form.estimated_hours} onChange={e => setForm(p => ({...p, estimated_hours: e.target.value}))} />
              </div>

              <div className="divider" />
              <button className="btn btn-primary" onClick={handleSave} disabled={loading || !form.title.trim()}>
                {loading ? <><Loader2 size={14} className="spin" /> Saving...</> : isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // kanban | list | members
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [memberModal, setMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`)
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
      else toast.error('Failed to load project');
    } finally { setLoading(false); }
  }, [projectId, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = filteredTasks.filter(t => t.status === s);
    return acc;
  }, {});

  const handleTaskUpdate = (updatedTask, isNew) => {
    setTasks(prev => isNew ? [updatedTask, ...prev] : prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleTaskDelete = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email: inviteEmail, role: inviteRole });
      setMembers(prev => [...prev, res.data.member]);
      setInviteEmail('');
      toast.success('Member added!');
      setMemberModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setInviteLoading(false); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to remove'); }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await api.patch(`/projects/${projectId}/members/${memberId}`, { role });
      setMembers(prev => prev.map(m => m.id === memberId ? {...m, role} : m));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update role'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--accent)' }} />
    </div>
  );

  const pct = project.task_count ? Math.round(project.completed_tasks / project.task_count * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Link to="/projects" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Projects
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color }} />
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>{project.name}</h1>
              <span className={`badge badge-${project.my_role}`}>{project.my_role}</span>
            </div>
            {project.description && <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 500 }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {project.my_role === 'admin' && (
              <button className="btn btn-secondary btn-sm" onClick={() => setMemberModal(true)}>
                <UserPlus size={14} /> Add Member
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>
              <Plus size={14} /> New Task
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '14px 0', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', align: 'center', gap: 6 }}>
            <span>{project.task_count} tasks</span>
            <span>·</span>
            <span style={{ color: '#4ade80' }}>{project.completed_tasks} done</span>
            {project.overdue_count > 0 && <><span>·</span><span style={{ color: '#f87171' }}>{project.overdue_count} overdue</span></>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 200 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: project.color }} />
            </div>
            <span>{pct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} />
            {members.slice(0, 4).map(m => <Avatar key={m.id} name={m.name} color={m.avatar_color} size="sm" />)}
            {members.length > 4 && <span>+{members.length - 4}</span>}
          </div>
        </div>

        {/* View switcher + filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
            {[['kanban', <LayoutGrid size={14} />, 'Kanban'], ['list', <List size={14} />, 'List'], ['members', <Users size={14} />, 'Team']].map(([v, icon, label]) => (
              <button key={v} onClick={() => setView(v)} className="btn" style={{ padding: '6px 12px', fontSize: 13, background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? 'white' : 'var(--text-secondary)', border: 'none' }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {view !== 'members' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{ position: 'relative', maxWidth: 220 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, height: 34, fontSize: 13 }} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height: 34, fontSize: 13, width: 'auto' }}>
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ height: 34, fontSize: 13, width: 'auto' }}>
                <option value="">All Priority</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 32px 40px' }}>
        {/* Kanban */}
        {view === 'kanban' && (
          <div className="kanban-board">
            {STATUSES.map(status => (
              <div key={status} className="kanban-col">
                <div className="kanban-col-header">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                  {STATUS_LABELS[status]}
                  <span style={{ marginLeft: 'auto', background: 'var(--bg-hover)', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                    {tasksByStatus[status].length}
                  </span>
                </div>
                <div className="kanban-col-body">
                  {tasksByStatus[status].map(task => (
                    <TaskCard key={task.id} task={task} members={members} projectRole={project.my_role}
                      onClick={setTaskModal} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12 }}
                    onClick={() => setTaskModal('new')}>
                    <Plus size={12} /> Add task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {view === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredTasks.length === 0 ? (
              <div className="empty-state"><Plus size={32} /><h3>No tasks found</h3><p>Create a task or adjust your filters.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTaskModal('new')}><Plus size={14} /> Add Task</button>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const isOverdue = task.due_date && isAfter(new Date(), parseISO(task.due_date)) && task.status !== 'done';
                    return (
                      <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setTaskModal(task)}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{task.title}</div>
                          {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>{task.description}</div>}
                        </td>
                        <td><span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span></td>
                        <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                        <td>
                          {task.assignee_id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar name={task.assignee_name} color={task.assignee_color} size="sm" />
                              <span style={{ fontSize: 13 }}>{task.assignee_name}</span>
                            </div>
                          ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unassigned</span>}
                        </td>
                        <td style={{ color: isOverdue ? '#f87171' : 'inherit', fontSize: 13 }}>
                          {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                          {isOverdue && <span style={{ marginLeft: 6, fontSize: 11 }}>⚠</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Members */}
        {view === 'members' && (
          <div className="card" style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Team Members ({members.length})</h2>
              {project.my_role === 'admin' && (
                <button className="btn btn-primary btn-sm" onClick={() => setMemberModal(true)}><UserPlus size={14} /> Add Member</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <Avatar name={m.name} color={m.avatar_color} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name} {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(you)</span>}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {project.my_role === 'admin' && m.id !== user?.id && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} style={{ height: 30, fontSize: 12, width: 'auto', padding: '4px 8px' }}>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button className="btn btn-danger btn-xs" onClick={() => handleRemoveMember(m.id)}><X size={12} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task modal */}
      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          members={members}
          projectRole={project.my_role}
          onClose={() => setTaskModal(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}

      {/* Invite member modal */}
      {memberModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMemberModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add Team Member</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal(false)} style={{ padding: 6 }}><X size={16} /></button>
            </div>
            <form onSubmit={handleInvite} className="modal-body">
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="member">Member — Can view and manage tasks</option>
                  <option value="admin">Admin — Full project control</option>
                </select>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>The user must already have a ProjectFlow account.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviteLoading}>
                  {inviteLoading ? <><Loader2 size={14} className="spin" /> Adding...</> : <><UserPlus size={14} /> Add Member</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
