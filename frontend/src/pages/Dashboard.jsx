import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isAfter, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, FolderKanban, TrendingUp, ArrowRight, Calendar } from 'lucide-react';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const STATUS_COLORS = { todo: '#6366f1', in_progress: '#fbbf24', review: '#a78bfa', done: '#4ade80' };
const PRIORITY_COLORS = { critical: '#ff6b7a', high: '#fb923c', medium: '#fbbf24', low: '#4ade80' };

const MiniBar = ({ value, max, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ flex: 1, background: 'var(--bg-hover)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${max ? (value / max * 100) : 0}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{value}</span>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-content">
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
    </div>
  );

  const { stats, myTasks, activity, tasksByStatus, tasksByPriority, projects, overdueTasks } = data || {};
  const totalStatusTasks = tasksByStatus?.reduce((s, t) => s + t.count, 0) || 0;
  const totalPriorityTasks = tasksByPriority?.reduce((s, t) => s + t.count, 0) || 0;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{format(new Date(), 'EEEE, MMMM d')}</div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Welcome back, <strong style={{ color: 'var(--text-secondary)' }}>{user?.name}</strong> — here's your workspace overview</p>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(99,102,241,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderKanban size={20} color="#818cf8" />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#818cf8' }}>{stats?.total_projects || 0}</div>
            <div className="stat-label">Active Projects</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(251,191,36,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#fbbf24" />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{stats?.total_tasks || 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(34,197,94,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#4ade80" />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#4ade80' }}>{stats?.completed_tasks || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(239,68,68,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color="#f87171" />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#f87171' }}>{stats?.overdue_tasks || 0}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 20, marginBottom: 24 }}>
          {/* My Tasks */}
          <div className="card" style={{ gridColumn: '1 / 3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>My Tasks</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{myTasks?.length || 0} active</span>
            </div>
            {myTasks?.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <CheckCircle2 size={32} />
                <h3>All caught up!</h3>
                <p>No tasks assigned to you right now.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myTasks?.map(task => (
                  <Link to={`/projects/${task.project_id}`} key={task.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', transition: 'all 0.15s', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: PRIORITY_COLORS[task.priority] || '#666', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ color: task.project_color }}>{task.project_name}</span>
                        {task.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: isAfter(new Date(), parseISO(task.due_date)) ? '#f87171' : 'inherit' }}>
                          <Calendar size={11} /> {format(parseISO(task.due_date), 'MMM d')}
                        </span>}
                      </div>
                    </div>
                    <span className={`badge badge-${task.status}`} style={{ fontSize: 11 }}>{STATUS_LABELS[task.status]}</span>
                    <span className={`badge badge-${task.priority}`} style={{ fontSize: 11 }}>{task.priority}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column: charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Tasks by Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['todo', 'in_progress', 'review', 'done'].map(s => {
                  const found = tasksByStatus?.find(t => t.status === s);
                  return (
                    <div key={s}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{STATUS_LABELS[s]}</span>
                      </div>
                      <MiniBar value={found?.count || 0} max={totalStatusTasks} color={STATUS_COLORS[s]} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Open by Priority</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['critical', 'high', 'medium', 'low'].map(p => {
                  const found = tasksByPriority?.find(t => t.priority === p);
                  return (
                    <div key={p}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p}</span>
                      </div>
                      <MiniBar value={found?.count || 0} max={totalPriorityTasks} color={PRIORITY_COLORS[p]} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: Projects + Overdue + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Projects */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Projects</h2>
              <Link to="/projects" style={{ fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={12} /></Link>
            </div>
            {projects?.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><FolderKanban size={28} /><h3>No projects yet</h3><p>Create your first project to get started.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects?.map(p => {
                  const pct = p.total_tasks ? Math.round(p.done_tasks / p.total_tasks * 100) : 0;
                  return (
                    <Link to={`/projects/${p.id}`} key={p.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', transition: 'all 0.15s', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = p.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36 }}>{pct}%</span>
                        </div>
                      </div>
                      {p.overdue > 0 && <span className="badge badge-critical" style={{ fontSize: 11 }}>{p.overdue} overdue</span>}
                      <span className={`badge badge-${p.my_role}`} style={{ fontSize: 10 }}>{p.my_role}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h2>
            {activity?.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><TrendingUp size={28} /><h3>No activity yet</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activity?.slice(0, 10).map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 10 }}>
                    <div className="avatar avatar-sm" style={{ background: a.avatar_color || 'var(--accent)', flexShrink: 0, marginTop: 2 }}>
                      {a.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{a.user_name}</strong>{' '}
                        {a.action === 'task_created' && `created task "${a.task_title || a.details?.title}"`}
                        {a.action === 'task_status_changed' && `moved "${a.task_title}" to ${STATUS_LABELS[a.details?.to]}`}
                        {a.action === 'project_created' && `created project "${a.project_name || a.details?.name}"`}
                        {a.action === 'member_added' && `added ${a.details?.addedUser} to project`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {a.created_at ? format(new Date(a.created_at), 'MMM d, h:mm a') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
