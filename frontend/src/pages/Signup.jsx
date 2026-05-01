import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      toast.success('Account created! Welcome to ProjectFlow 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(108,99,255,0.08) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: 'var(--accent)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 0 40px var(--accent-glow)' }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Get started free</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Create your ProjectFlow workspace</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input type="text" placeholder="John Smith" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required autoFocus minLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Password</label>
              <input type={showPw ? 'text' : 'password'} placeholder="At least 6 characters" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required minLength={6} style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, bottom: 11, background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input type="password" placeholder="Repeat your password" value={form.confirm} onChange={e => setForm(p => ({...p, confirm: e.target.value}))} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }} disabled={loading}>
              {loading ? <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Create Account'}
            </button>
          </form>

          <div className="divider" />
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
