import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api, { resolveApiUrl } from '../services/api'
import { emitToast } from '../utils/toast'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [linkedInUrl, setLinkedInUrl] = useState('')
  const [gitHubUrl, setGitHubUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showWizard, setShowWizard] = useState(true)
  const [preferences, setPreferences] = useState({ autoAssign: true, notifyUpdates: true, defaultView: 'Dashboard' })

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName || user.name || '')
    setBio(user.bio || '')
    setLinkedInUrl(user.linkedInUrl || '')
    setGitHubUrl(user.gitHubUrl || '')
    setPortfolioUrl(user.portfolioUrl || '')
    setProfileImageUrl(user.profileImageUrl || '')
  }, [user])

  const avatarSrc = useMemo(() => {
    if (previewUrl) return previewUrl
    if (profileImageUrl) return resolveApiUrl(profileImageUrl)
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.email || 'KY') + '&background=0f172a&color=fff'
  }, [previewUrl, profileImageUrl, user?.email])

  async function loadProfile() {
    try {
      const res = await api.get('/api/profile')
      const profile = res.data || {}
      setDisplayName(profile.displayName || '')
      setBio(profile.bio || '')
      setLinkedInUrl(profile.linkedInUrl || '')
      setGitHubUrl(profile.gitHubUrl || '')
      setPortfolioUrl(profile.portfolioUrl || '')
      setProfileImageUrl(profile.profileImageUrl || '')
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
    } catch (ex) {
      setError(ex?.response?.data?.message || 'Unable to load your profile right now.')
    }
  }

  useEffect(() => {
    if (!authLoading) {
      loadProfile().catch(() => {})
    }
  }, [authLoading])

  function handlePreferenceSave(event) {
    event.preventDefault()
    emitToast('Workspace preferences saved.', 'success')
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG, or WEBP image.')
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 2MB or smaller.')
      return
    }

    setError('')
    setMessage('')
    setUploading(true)

    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/api/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const nextUrl = res?.data?.profileImageUrl || ''
      setProfileImageUrl(nextUrl)
      setPreviewUrl('')
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setMessage('Profile picture updated successfully.')
    } catch (ex) {
      setPreviewUrl('')
      setError(ex?.response?.data?.message || 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.put('/api/profile', { clearProfileImage: true, displayName, bio, linkedInUrl, gitHubUrl, portfolioUrl })
      setProfileImageUrl('')
      setPreviewUrl('')
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setMessage('Profile picture removed.')
    } catch (ex) {
      setError(ex?.response?.data?.message || 'Unable to remove the profile picture.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDisplayName() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.put('/api/profile', { displayName, bio, linkedInUrl, gitHubUrl, portfolioUrl, clearProfileImage: false })
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setMessage('Profile updated successfully.')
    } catch (ex) {
      setError(ex?.response?.data?.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 24 }}>
      {showWizard && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 12, color: '#2563eb' }}>First login setup</p>
            <h3 style={{ margin: '6px 0 4px', color: '#0f172a' }}>Welcome to Kyro</h3>
            <p style={{ margin: 0, color: '#475569' }}>Use this setup to confirm your first-view preferences and jump into work faster.</p>
          </div>
          <button type="button" onClick={() => setShowWizard(false)} style={{ padding: '10px 16px', borderRadius: 999, background: '#fff', color: '#0f172a', border: '1px solid #bfdbfe', cursor: 'pointer' }}>Skip for now</button>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg, #0f172a, #111827)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, color: 'white', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.25)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: 12, opacity: 0.8 }}>Profile</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 28 }}>Manage your identity and avatar</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.8, maxWidth: 560 }}>Keep your Kyro ITSM presence aligned with your team and your workspace.</p>
          </div>
          <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', background: '#1f2937' }}>
            <img src={avatarSrc} alt="Profile avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' }}>
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e7eb', background: '#f8fafc' }}>
              <img src={avatarSrc} alt="Current profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 12, color: '#64748b' }}>Current avatar</p>
              <h3 style={{ margin: '6px 0 2px', fontSize: 20, color: '#0f172a' }}>{displayName || user?.email || 'Your profile'}</h3>
              <p style={{ margin: 0, color: '#64748b' }}>PNG, JPG, or WEBP up to 2MB.</p>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', borderRadius: 999, background: '#0f172a', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
              Upload photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
            </label>
            <button type="button" onClick={handleRemove} disabled={saving} style={{ padding: '10px 16px', borderRadius: 999, background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Working...' : 'Remove picture'}
            </button>
          </div>

          {(message || error) && (
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: message ? '#ecfdf3' : '#fef2f2', color: message ? '#166534' : '#b91c1c' }}>
              {message || error}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0f172a' }}>Display name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0f172a' }}>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people a bit about yourself" rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0f172a' }}>LinkedIn</label>
                <input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/.." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0f172a' }}>GitHub</label>
                <input value={gitHubUrl} onChange={(e) => setGitHubUrl(e.target.value)} placeholder="https://github.com/.." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#0f172a' }}>Portfolio</label>
                <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-site.com" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }} />
              </div>
            </div>
            <button type="button" onClick={handleSaveDisplayName} disabled={saving} style={{ marginTop: 4, padding: '10px 16px', borderRadius: 999, background: '#111827', color: 'white', border: 'none', cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </section>

        <aside style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, display: 'grid', gap: 16 }}>
          <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 12, color: '#64748b' }}>Preview</p>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '2px solid #dbeafe', background: '#e2e8f0' }}>
              <img src={avatarSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', color: '#0f172a' }}>Enterprise-ready identity</h4>
              <p style={{ margin: 0, color: '#64748b', lineHeight: 1.5 }}>Avatars appear across the shell, the profile page, and future team surfaces.</p>
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>What gets saved</p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#64748b', lineHeight: 1.7 }}>
              <li>Your profile photo</li>
              <li>Your display name</li>
              <li>These values are loaded from your authenticated profile on every visit</li>
            </ul>
          </div>

          <form onSubmit={handlePreferenceSave} style={{ padding: 14, borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Workspace preferences</p>
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, color: '#334155' }}>
                <span>Default view</span>
                <select value={preferences.defaultView} onChange={(event) => setPreferences((current) => ({ ...current, defaultView: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <option value="Dashboard">Dashboard</option>
                  <option value="Tickets">Tickets</option>
                  <option value="Knowledge">Knowledge</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                <span>Auto-assign tickets</span>
                <input type="checkbox" checked={preferences.autoAssign} onChange={(event) => setPreferences((current) => ({ ...current, autoAssign: event.target.checked }))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                <span>Notify on updates</span>
                <input type="checkbox" checked={preferences.notifyUpdates} onChange={(event) => setPreferences((current) => ({ ...current, notifyUpdates: event.target.checked }))} />
              </label>
            </div>
            <button type="submit" style={{ marginTop: 12, padding: '10px 14px', borderRadius: 999, background: '#111827', color: 'white', border: 'none', cursor: 'pointer' }}>Save preferences</button>
          </form>
        </aside>
      </div>
    </div>
  )
}
