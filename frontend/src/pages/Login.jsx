import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      {/* Background grid */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(108,99,255,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: 'var(--accent)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 0 40px var(--accent-glow)' }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>ProjectFlow</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in to your workspace</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required autoFocus />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Password</label>
              <input type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, bottom: 11, background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }} disabled={loading}>
              {loading ? <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Sign In'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one free</Link>
          </div>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: 16, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          💡 <strong>Demo:</strong> Use any email & password to register, or login with test@example.com / password123
        </div>
      </div>
    </div>
  );
}
