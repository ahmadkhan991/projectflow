import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, FolderKanban, Users, CheckSquare, X, Calendar, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PROJECT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0], due_date: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/projects', form);
      setProjects(prev => [res.data.project, ...prev]);
      setShowModal(false);
      setForm({ name: '', description: '', color: PROJECT_COLORS[0], due_date: '' });
      toast.success('Project created!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Projects</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage and collaborate on your projects</p>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <FolderKanban size={48} />
            <h3>No projects yet</h3>
            <p>Create your first project to start managing tasks and collaborating.</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map(p => {
              const pct = p.task_count ? Math.round(p.completed_tasks / p.task_count * 100) : 0;
              return (
                <Link to={`/projects/${p.id}`} key={p.id}
                  style={{ display: 'block', textDecoration: 'none' }}
                >
                  <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${p.color}`, height: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, flex: 1, marginRight: 10 }}>{p.name}</h3>
                      <span className={`badge badge-${p.my_role}`} style={{ fontSize: 10 }}>{p.my_role}</span>
                    </div>

                    {p.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>Progress</span>
                        <span>{p.completed_tasks}/{p.task_count} tasks</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={13} /> {p.member_count}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckSquare size={13} /> {p.task_count}
                      </span>
                      {p.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <Calendar size={12} /> {format(parseISO(p.due_date), 'MMM d')}
                      </span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Project</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} style={{ padding: 6 }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label className="form-label">Project name *</label>
                <input type="text" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required autoFocus maxLength={120} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea placeholder="What is this project about?" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} maxLength={500} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {PROJECT_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(p => ({...p, color: c}))}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 1 }} />
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Due date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><Loader2 size={14} className="spin" /> Creating...</> : <><Plus size={14} /> Create Project</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
