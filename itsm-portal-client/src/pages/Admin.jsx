import React, { useEffect, useMemo, useState } from 'react'
import ErrorBanner from '../Components/ErrorBanner'
import LoadingSpinner from '../Components/LoadingSpinner'
import RoleGuard from '../Components/RoleGuard'
import api from '../services/api'
import { createSetupWizard } from '../services/setupWizardService'
import { getSubscriptionPlans } from '../services/subscriptionService'
import { getErrorMessage } from '../services/ticketService'
import { getOrganizationSettings, updateOrganizationSettings, uploadOrganizationLogo, resetDemoData } from '../services/organizationSettingsService'
import { getSlaPolicies, updateSlaPolicy } from '../services/slaService'
import { resolveApiUrl } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const roleOptions = ['Admin', 'Technician', 'Employee']
const statusOptions = ['All', 'Active', 'Inactive']

function formatDate(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function getInitials(user) {
  const source = user.displayName || user.email || 'User'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U'
}

function getAvatarUrl(user) {
  return user.avatarUrl || user.profilePictureUrl || user.avatar || user.pictureUrl || ''
}

export default function Admin() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'Admin'
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [tickets, setTickets] = useState([])
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'displayName', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [detailUser, setDetailUser] = useState(null)
  const [bulkRole, setBulkRole] = useState('Technician')
  const [bulkDepartmentId, setBulkDepartmentId] = useState('')
  const [bulkActive, setBulkActive] = useState(true)
  const [auditLog, setAuditLog] = useState([])
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [setupForm, setSetupForm] = useState({
    companyName: '',
    companyDescription: 'A production-ready ITSM workspace for modern service operations.',
    primaryContactEmail: '',
    adminEmail: '',
    adminPassword: 'ChangeMe@123',
    departments: 'Service Desk,Infrastructure,Security',
    roles: 'Employee,Manager',
    notificationSettings: { emailNotifications: true },
    automationDefaults: { autoAssign: true }
  })
  const [setupSaving, setSetupSaving] = useState(false)
  const [setupMessage, setSetupMessage] = useState('')
  const [plans, setPlans] = useState([])
  const [branding, setBranding] = useState(null)
  const [brandingForm, setBrandingForm] = useState({ organizationName: '', primaryColor: '#1d4ed8' })
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [brandingMessage, setBrandingMessage] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [slaPolicies, setSlaPolicies] = useState([])
  const [slaSavingPriority, setSlaSavingPriority] = useState(null)
  const [slaMessage, setSlaMessage] = useState('')
  const [demoResetting, setDemoResetting] = useState(false)
  const [demoResetMessage, setDemoResetMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.allSettled([
      api.get('/api/users'),
      api.get('/api/users/departments'),
      api.get('/api/tickets')
    ]).then(([usersResult, departmentsResult, ticketsResult]) => {
      if (!active) return
      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value.data || [])
      } else {
        setError(getErrorMessage(usersResult.reason, 'Admin data could not be loaded.'))
      }

      if (departmentsResult.status === 'fulfilled') {
        setDepartments(departmentsResult.value.data || [])
      } else if (usersResult.status !== 'fulfilled' || departmentsResult.status !== 'fulfilled') {
        setError(getErrorMessage(departmentsResult.reason, 'Departments could not be loaded.'))
      }

      if (ticketsResult.status === 'fulfilled') {
        const ticketsData = ticketsResult.value.data
        setTickets(Array.isArray(ticketsData) ? ticketsData : ticketsData?.items || [])
      }
    }).catch((ex) => {
      if (active) setError(getErrorMessage(ex, 'Admin data could not be loaded.'))
    }).finally(() => active && setLoading(false))

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getSubscriptionPlans().then((data) => {
      if (active) setPlans(Array.isArray(data) ? data : [])
    }).catch(() => {
      if (active) setPlans([])
    })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getOrganizationSettings().then((data) => {
      if (!active) return
      setBranding(data)
      setBrandingForm({ organizationName: data?.organizationName || '', primaryColor: data?.primaryColor || '#1d4ed8' })
    }).catch(() => {
      if (active) setBranding(null)
    })

    getSlaPolicies().then((data) => {
      if (active) setSlaPolicies(Array.isArray(data) ? data : [])
    }).catch(() => {
      if (active) setSlaPolicies([])
    })

    return () => { active = false }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, statusFilter, searchQuery, pageSize])

  const departmentLookup = useMemo(() => {
    return departments.reduce((acc, department) => {
      acc[department.id] = department
      return acc
    }, {})
  }, [departments])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return users.filter((user) => {
      const matchesRole = roleFilter === 'All' || user.role === roleFilter
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? user.isActive !== false : user.isActive === false)
      const departmentName = departmentLookup[user.departmentId]?.name || ''
      const searchText = `${user.displayName || ''} ${user.email || ''} ${user.role || ''} ${departmentName}`.toLowerCase()
      const matchesQuery = !query || searchText.includes(query)
      return matchesRole && matchesStatus && matchesQuery
    })
  }, [departmentLookup, roleFilter, searchQuery, statusFilter, users])

  const sortedUsers = useMemo(() => {
    const items = [...filteredUsers]
    items.sort((left, right) => {
      const leftValue = left[sortConfig.key] ?? ''
      const rightValue = right[sortConfig.key] ?? ''
      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' })
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
    return items
  }, [filteredUsers, sortConfig])

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedUsers.slice(start, start + pageSize)
  }, [currentPage, pageSize, sortedUsers])

  const pageCount = Math.max(1, Math.ceil(sortedUsers.length / pageSize))

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive !== false).length
    const adminCount = users.filter((user) => user.role === 'Admin').length
    const technicianCount = users.filter((user) => user.role === 'Technician' && user.isActive !== false).length
    const openTicketCount = tickets.filter((ticket) => !['resolved', 'closed', 'completed', 'done'].includes(String(ticket.status || '').toLowerCase())).length
    const slaValues = tickets
      .map((ticket) => Number(ticket.slaCompliance ?? ticket.slaCompliancePercent ?? ticket.slaPercent ?? ticket.slaScore))
      .filter((value) => !Number.isNaN(value))

    const averageSla = slaValues.length
      ? `${Math.round(slaValues.reduce((sum, value) => sum + value, 0) / slaValues.length)}%`
      : 'N/A'

    return {
      total: users.length,
      active: activeUsers,
      admins: adminCount,
      technicians: technicianCount,
      departments: departments.length,
      openTickets: openTicketCount,
      sla: averageSla
    }
  }, [departments.length, tickets, users])

  async function updateRole(userId, role) {
    try {
      await api.put(`/api/users/${userId}/role`, role)
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user))
      const target = users.find((user) => user.id === userId)
      if (target) {
        setAuditLog((current) => [{ id: Date.now(), action: 'Role changed', detail: `${target.displayName || target.email} → ${role}` }, ...current].slice(0, 8))
      }
    } catch (ex) {
      setError(getErrorMessage(ex, 'Role update failed.'))
    }
  }

  async function updateDepartment(userId, departmentId) {
    try {
      await api.put(`/api/users/${userId}/department`, departmentId)
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, departmentId } : user))
      const target = users.find((user) => user.id === userId)
      const departmentName = departments.find((department) => department.id === Number(departmentId))?.name || 'Unassigned'
      if (target) {
        setAuditLog((current) => [{ id: Date.now(), action: 'Department updated', detail: `${target.displayName || target.email} → ${departmentName}` }, ...current].slice(0, 8))
      }
    } catch (ex) {
      setError(getErrorMessage(ex, 'Department update failed.'))
    }
  }

  async function toggleActive(userId, isActive) {
    try {
      await api.put(`/api/users/${userId}/active`, isActive)
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, isActive } : user))
      const target = users.find((user) => user.id === userId)
      if (target) {
        setAuditLog((current) => [{ id: Date.now(), action: 'Account updated', detail: `${target.displayName || target.email} → ${isActive ? 'Active' : 'Inactive'}` }, ...current].slice(0, 8))
      }
    } catch (ex) {
      setError(getErrorMessage(ex, 'Active status update failed.'))
    }
  }

  async function handleBulkApply() {
    if (!selectedUserIds.length) return

    try {
      await Promise.all(selectedUserIds.map((userId) => {
        const user = users.find((item) => item.id === userId)
        const updates = []
        if (user?.role !== bulkRole) updates.push(api.put(`/api/users/${userId}/role`, bulkRole))
        if (Number(user?.departmentId) !== Number(bulkDepartmentId)) updates.push(api.put(`/api/users/${userId}/department`, Number(bulkDepartmentId)))
        if ((user?.isActive !== false) !== bulkActive) updates.push(api.put(`/api/users/${userId}/active`, bulkActive))
        return Promise.all(updates)
      }))

      setUsers((current) => current.map((user) => {
        if (!selectedUserIds.includes(user.id)) return user
        return {
          ...user,
          role: bulkRole,
          departmentId: bulkDepartmentId ? Number(bulkDepartmentId) : user.departmentId,
          isActive: bulkActive
        }
      }))
      setAuditLog((current) => [{ id: Date.now(), action: 'Bulk update', detail: `${selectedUserIds.length} users changed` }, ...current].slice(0, 8))
      setSelectedUserIds([])
    } catch (ex) {
      setError(getErrorMessage(ex, 'Bulk update failed.'))
    }
  }

  function handleSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  function toggleSelectedUser(userId) {
    setSelectedUserIds((current) => current.includes(userId) ? current.filter((value) => value !== userId) : [...current, userId])
  }

  async function handleSetupSubmit(event) {
    event.preventDefault()
    setSetupSaving(true)
    setSetupMessage('')

    try {
      const payload = {
        companyName: setupForm.companyName,
        companyDescription: setupForm.companyDescription,
        primaryContactEmail: setupForm.primaryContactEmail || setupForm.adminEmail,
        adminEmail: setupForm.adminEmail,
        adminPassword: setupForm.adminPassword,
        departments: setupForm.departments.split(',').map((value) => value.trim()).filter(Boolean),
        roles: setupForm.roles.split(',').map((value) => value.trim()).filter(Boolean),
        notificationSettings: setupForm.notificationSettings,
        automationDefaults: setupForm.automationDefaults
      }

      const response = await createSetupWizard(payload)
      setSetupMessage(`Setup complete for ${response.organization?.name || setupForm.companyName}.`)
      setShowSetupWizard(false)
      setSetupForm((current) => ({ ...current, companyName: '', companyDescription: current.companyDescription, primaryContactEmail: '', adminEmail: '', adminPassword: 'ChangeMe@123', departments: 'Service Desk,Infrastructure,Security', roles: 'Employee,Manager' }))
      setAuditLog((current) => [{ id: Date.now(), action: 'Setup wizard', detail: `${response.organization?.name || setupForm.companyName} onboarded` }, ...current].slice(0, 8))
    } catch (ex) {
      setSetupMessage(getErrorMessage(ex, 'Setup wizard could not be completed.'))
    } finally {
      setSetupSaving(false)
    }
  }

  function selectAllVisible() {
    const visibleIds = pagedUsers.map((user) => user.id)
    setSelectedUserIds((current) => current.length === visibleIds.length ? [] : visibleIds)
  }

  async function handleBrandingSubmit(event) {
    event.preventDefault()
    setBrandingSaving(true)
    setBrandingMessage('')
    try {
      const updated = await updateOrganizationSettings({
        organizationName: brandingForm.organizationName,
        primaryColor: brandingForm.primaryColor
      })
      setBranding((current) => ({ ...current, ...updated }))
      setBrandingMessage('Branding updated.')
      setAuditLog((current) => [{ id: Date.now(), action: 'Branding updated', detail: updated.organizationName || brandingForm.organizationName }, ...current].slice(0, 8))
    } catch (ex) {
      setBrandingMessage(getErrorMessage(ex, 'Branding update failed.'))
    } finally {
      setBrandingSaving(false)
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setBrandingMessage('')
    try {
      const updated = await uploadOrganizationLogo(file)
      setBranding((current) => ({ ...current, logoUrl: updated.logoUrl }))
      setBrandingMessage('Logo updated.')
      setAuditLog((current) => [{ id: Date.now(), action: 'Logo updated', detail: 'Organization logo changed' }, ...current].slice(0, 8))
    } catch (ex) {
      setBrandingMessage(getErrorMessage(ex, 'Logo upload failed.'))
    } finally {
      setLogoUploading(false)
      event.target.value = ''
    }
  }

  async function handleResetDemoData() {
    const confirmed = window.confirm('This will reset all demo tickets, assets, service requests, approvals, and automation activity for this organization. Users, departments, and configuration are kept. Continue?')
    if (!confirmed) return
    setDemoResetting(true)
    setDemoResetMessage('')
    try {
      await resetDemoData()
      setDemoResetMessage('Demo data has been reset. Refresh the dashboard to see the new dataset.')
      setAuditLog((current) => [{ id: Date.now(), action: 'Demo data reset', detail: 'Tickets, assets, and approvals regenerated' }, ...current].slice(0, 8))
    } catch (ex) {
      setDemoResetMessage(getErrorMessage(ex, 'Demo data reset failed.'))
    } finally {
      setDemoResetting(false)
    }
  }

  function handleSlaFieldChange(priority, field, value) {
    setSlaPolicies((current) => current.map((policy) => policy.priority === priority ? { ...policy, [field]: value } : policy))
  }

  async function handleSlaSave(priority) {
    const policy = slaPolicies.find((item) => item.priority === priority)
    if (!policy) return
    setSlaSavingPriority(priority)
    setSlaMessage('')
    try {
      const responseMinutes = Number(policy.responseTargetMinutes)
      const resolutionMinutes = Number(policy.resolutionTargetMinutes)
      const updated = await updateSlaPolicy(priority, {
        responseTargetMinutes: responseMinutes,
        resolutionTargetMinutes: resolutionMinutes
      })
      setSlaPolicies((current) => current.map((item) => item.priority === priority ? updated : item))
      setSlaMessage(`${priority} SLA targets saved.`)
      setAuditLog((current) => [{ id: Date.now(), action: 'SLA policy updated', detail: `${priority} → ${responseMinutes}m response / ${resolutionMinutes}m resolution` }, ...current].slice(0, 8))
    } catch (ex) {
      setSlaMessage(getErrorMessage(ex, 'SLA policy update failed.'))
    } finally {
      setSlaSavingPriority(null)
    }
  }

  if (loading) return <section className="feature-page"><LoadingSpinner /></section>

  return (
    <section className="feature-page">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Workspace administration</h1>
          <p>Manage users, roles, permissions, and service teams from one centralized workspace.</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="admin-overview">
        <div className="admin-overview__card">
          <p className="dashboard-card__eyebrow">Total users</p>
          <strong>{stats.total}</strong>
          <span>Across the workspace</span>
        </div>
        <div className="admin-overview__card">
          <p className="dashboard-card__eyebrow">Active technicians</p>
          <strong>{stats.technicians}</strong>
          <span>Ready for service delivery</span>
        </div>
        <div className="admin-overview__card">
          <p className="dashboard-card__eyebrow">Active departments</p>
          <strong>{stats.departments}</strong>
          <span>Operational service groups</span>
        </div>
        <div className="admin-overview__card">
          <p className="dashboard-card__eyebrow">Open tickets</p>
          <strong>{stats.openTickets}</strong>
          <span>SLA insight: {stats.sla}</span>
        </div>
      </div>

      <div className="admin-workspace">
        <div className="dashboard-card admin-panel admin-panel--wide">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Customer onboarding</p>
              <h2>Setup wizard</h2>
            </div>
            <button className="secondary-button" onClick={() => setShowSetupWizard((value) => !value)}>{showSetupWizard ? 'Hide wizard' : 'Open wizard'}</button>
          </div>

          {showSetupWizard ? (
            <form className="admin-form" onSubmit={handleSetupSubmit}>
              <div className="dashboard-card__header" style={{ padding: 0, marginBottom: 16 }}>
                <div>
                  <p className="dashboard-card__eyebrow">15-minute onboarding</p>
                  <h3>Launch a new customer workspace</h3>
                </div>
              </div>
              <div className="admin-form__grid">
                <label className="admin-modal__field">
                  <span>Company name</span>
                  <input required value={setupForm.companyName} onChange={(event) => setSetupForm((current) => ({ ...current, companyName: event.target.value }))} />
                </label>
                <label className="admin-modal__field">
                  <span>Primary contact email</span>
                  <input type="email" value={setupForm.primaryContactEmail} onChange={(event) => setSetupForm((current) => ({ ...current, primaryContactEmail: event.target.value }))} />
                </label>
                <label className="admin-modal__field">
                  <span>Admin email</span>
                  <input type="email" required value={setupForm.adminEmail} onChange={(event) => setSetupForm((current) => ({ ...current, adminEmail: event.target.value }))} />
                </label>
                <label className="admin-modal__field">
                  <span>Admin password</span>
                  <input type="password" value={setupForm.adminPassword} onChange={(event) => setSetupForm((current) => ({ ...current, adminPassword: event.target.value }))} />
                </label>
              </div>
              <label className="admin-modal__field">
                <span>Company description</span>
                <textarea rows="3" value={setupForm.companyDescription} onChange={(event) => setSetupForm((current) => ({ ...current, companyDescription: event.target.value }))} />
              </label>
              <div className="admin-form__grid">
                <label className="admin-modal__field">
                  <span>Departments</span>
                  <input value={setupForm.departments} onChange={(event) => setSetupForm((current) => ({ ...current, departments: event.target.value }))} />
                </label>
                <label className="admin-modal__field">
                  <span>Roles</span>
                  <input value={setupForm.roles} onChange={(event) => setSetupForm((current) => ({ ...current, roles: event.target.value }))} />
                </label>
              </div>
              <div className="admin-form__grid">
                <label className="admin-modal__field">
                  <span>Plan</span>
                  <select defaultValue="Free trial" readOnly>
                    <option value="Free trial">Free trial</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </label>
                <label className="admin-modal__field">
                  <span>Brand color</span>
                  <input value="#1d4ed8" readOnly />
                </label>
              </div>
              <div className="admin-empty">Kyro can provision a ready-to-use workspace, departments, roles, and automation defaults for the first 15 minutes of onboarding.</div>
              {setupMessage ? <p className="admin-empty">{setupMessage}</p> : null}
              <div className="admin-modal__footer">
                <button className="secondary-button" type="button" onClick={() => setShowSetupWizard(false)}>Cancel</button>
                <button className="primary-button" type="submit" disabled={setupSaving}>{setupSaving ? 'Creating...' : 'Create onboarding setup'}</button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="dashboard-card admin-panel admin-panel--wide">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Company branding</p>
              <h2>Workspace identity</h2>
            </div>
          </div>
          <div className="admin-form" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, background: brandingForm.primaryColor || '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {branding?.logoUrl ? (
                  <img src={resolveApiUrl(branding.logoUrl)} alt="Organization logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <strong style={{ color: 'white', fontSize: 24 }}>{(brandingForm.organizationName || 'K').charAt(0).toUpperCase()}</strong>
                )}
              </div>
              <RoleGuard roles="Admin">
                <label className="secondary-button secondary-button--compact" style={{ cursor: 'pointer' }}>
                  {logoUploading ? 'Uploading...' : 'Upload logo'}
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleLogoUpload} disabled={logoUploading} style={{ display: 'none' }} />
                </label>
              </RoleGuard>
            </div>

            <RoleGuard roles="Admin">
              <form className="admin-form__grid" style={{ flex: 1, minWidth: 260 }} onSubmit={handleBrandingSubmit}>
                <label className="admin-modal__field">
                  <span>Organization name</span>
                  <input required maxLength={200} value={brandingForm.organizationName} onChange={(event) => setBrandingForm((current) => ({ ...current, organizationName: event.target.value }))} />
                </label>
                <label className="admin-modal__field">
                  <span>Primary color</span>
                  <input type="color" value={brandingForm.primaryColor} onChange={(event) => setBrandingForm((current) => ({ ...current, primaryColor: event.target.value }))} />
                </label>
                <div className="admin-modal__footer" style={{ gridColumn: '1 / -1' }}>
                  {brandingMessage ? <p className="admin-empty" style={{ marginRight: 'auto' }}>{brandingMessage}</p> : null}
                  <button className="primary-button" type="submit" disabled={brandingSaving}>{brandingSaving ? 'Saving...' : 'Save branding'}</button>
                </div>
              </form>
            </RoleGuard>
          </div>
        </div>

        <RoleGuard roles="Admin">
          <div className="dashboard-card admin-panel admin-panel--wide">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Demo mode</p>
                <h2>Reset demo data</h2>
              </div>
            </div>
            <div className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="admin-empty" style={{ margin: 0 }}>
                Restore a clean, realistic set of sample tickets, assets, service requests, approvals, and automation
                activity for this organization - safe to run between sales demos. Users, departments, knowledge
                articles, and automation rules are kept as-is.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="secondary-button" type="button" onClick={handleResetDemoData} disabled={demoResetting}>
                  {demoResetting ? 'Resetting...' : 'Reset demo data'}
                </button>
                {demoResetMessage ? <p className="admin-empty" style={{ margin: 0 }}>{demoResetMessage}</p> : null}
              </div>
            </div>
          </div>
        </RoleGuard>

        <div className="dashboard-card admin-panel admin-panel--wide">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Service level agreements</p>
              <h2>SLA policies by priority</h2>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Response target (minutes)</th>
                  <th>Resolution target (minutes)</th>
                  <RoleGuard roles="Admin"><th></th></RoleGuard>
                </tr>
              </thead>
              <tbody>
                {slaPolicies.map((policy) => (
                  <tr key={policy.priority}>
                    <td><strong>{policy.priority}</strong></td>
                    <td>
                      <RoleGuard roles="Admin" >
                        <input type="number" min="1" value={policy.responseTargetMinutes} onChange={(event) => handleSlaFieldChange(policy.priority, 'responseTargetMinutes', event.target.value)} style={{ width: 100 }} />
                      </RoleGuard>
                      {!isAdmin ? policy.responseTargetMinutes : null}
                    </td>
                    <td>
                      <RoleGuard roles="Admin">
                        <input type="number" min="1" value={policy.resolutionTargetMinutes} onChange={(event) => handleSlaFieldChange(policy.priority, 'resolutionTargetMinutes', event.target.value)} style={{ width: 100 }} />
                      </RoleGuard>
                      {!isAdmin ? policy.resolutionTargetMinutes : null}
                    </td>
                    <RoleGuard roles="Admin">
                      <td>
                        <button className="secondary-button secondary-button--compact" onClick={() => handleSlaSave(policy.priority)} disabled={slaSavingPriority === policy.priority}>
                          {slaSavingPriority === policy.priority ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </RoleGuard>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {slaMessage ? <p className="admin-empty">{slaMessage}</p> : null}
        </div>

        <div className="dashboard-card admin-panel admin-panel--wide">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">User management</p>
              <h2>Team access</h2>
            </div>
            <div className="admin-toolbar">
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search users" />
              <select className="dashboard-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="All">All roles</option>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="dashboard-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <div className="admin-bulk-bar">
            <div className="admin-bulk-bar__left">
              <label className="admin-toggle">
                <input type="checkbox" checked={selectedUserIds.length > 0 && selectedUserIds.length === pagedUsers.length} onChange={selectAllVisible} />
                Select visible
              </label>
              <span>{selectedUserIds.length} selected</span>
            </div>
            <div className="admin-bulk-actions">
              <select value={bulkRole} onChange={(event) => setBulkRole(event.target.value)}>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select value={bulkDepartmentId} onChange={(event) => setBulkDepartmentId(event.target.value)}>
                <option value="">Unassigned</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              <label className="admin-toggle">
                <input type="checkbox" checked={bulkActive} onChange={(event) => setBulkActive(event.target.checked)} />
                Active
              </label>
              <button className="secondary-button" onClick={handleBulkApply} disabled={!selectedUserIds.length}>Apply</button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th><button onClick={() => handleSort('displayName')}>Name</button></th>
                  <th><button onClick={() => handleSort('email')}>Email</button></th>
                  <th><button onClick={() => handleSort('role')}>Role</button></th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((user) => {
                  const department = departmentLookup[user.departmentId]
                  const avatarUrl = getAvatarUrl(user)
                  return (
                    <tr key={user.id}>
                      <td>
                        <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleSelectedUser(user.id)} />
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          {avatarUrl ? <img className="admin-user-cell__avatar" src={avatarUrl} alt={user.displayName || user.email} /> : <div className="admin-user-cell__avatar admin-user-cell__avatar--fallback">{getInitials(user)}</div>}
                          <div>
                            <strong>{user.displayName || user.email}</strong>
                            <div className="admin-user-cell__meta">{user.jobTitle || 'Workspace user'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <select value={user.role || 'Employee'} onChange={(event) => updateRole(user.id, event.target.value)}>
                          {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={user.departmentId || ''} onChange={(event) => updateDepartment(user.id, Number(event.target.value))}>
                          <option value="">Unassigned</option>
                          {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <label className="admin-toggle">
                          <input type="checkbox" checked={user.isActive !== false} onChange={(event) => toggleActive(user.id, event.target.checked)} />
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </label>
                      </td>
                      <td>{formatDate(user.lastLoginAt || user.lastLogin || user.lastSeenAt)}</td>
                      <td>
                        <button className="secondary-button secondary-button--compact" onClick={() => setDetailUser(user)}>View</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <span>Showing {sortedUsers.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length}</span>
            <div className="admin-pagination__controls">
              <button className="secondary-button secondary-button--compact" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>Prev</button>
              <span>Page {currentPage} of {pageCount}</span>
              <button className="secondary-button secondary-button--compact" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount}>Next</button>
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={6}>6 per page</option>
                <option value={8}>8 per page</option>
                <option value={12}>12 per page</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-side-stack">
          <div className="dashboard-card admin-panel">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Department oversight</p>
                <h2>Service groups</h2>
              </div>
            </div>
            <div className="admin-list">
              {departments.map((department) => {
                const memberCount = users.filter((user) => user.departmentId === department.id).length
                const openTickets = tickets.filter((ticket) => String(ticket.departmentId || '').toLowerCase() === String(department.id).toLowerCase()).length
                return (
                  <div key={department.id} className="admin-item admin-item--compact">
                    <div>
                      <strong>{department.name}</strong>
                      <p>{department.description || 'Operational service group'}</p>
                    </div>
                    <div className="admin-item__footer">
                      <span className="dashboard-badge dashboard-badge--open">{memberCount} users</span>
                      <span className="dashboard-badge dashboard-badge--medium">{openTickets} tickets</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dashboard-card admin-panel">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Audit trail</p>
                <h2>Recent admin activity</h2>
              </div>
            </div>
            <div className="admin-audit-list">
              {auditLog.length ? auditLog.map((entry) => (
                <div key={entry.id} className="admin-audit-item">
                  <strong>{entry.action}</strong>
                  <p>{entry.detail}</p>
                </div>
              )) : <div className="admin-empty">Changes you make here will appear here.</div>}
            </div>
          </div>
        </div>
      </div>

      {detailUser ? (
        <div className="admin-modal-backdrop" onClick={() => setDetailUser(null)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal__header">
              <div>
                <p className="dashboard-card__eyebrow">User details</p>
                <h3>{detailUser.displayName || detailUser.email}</h3>
              </div>
              <button className="nova-panel__close" onClick={() => setDetailUser(null)} aria-label="Close">×</button>
            </div>
            <div className="admin-modal__body">
              <div className="admin-modal__grid">
                <label className="admin-modal__field">
                  <span>Role</span>
                  <select value={detailUser.role || 'Employee'} onChange={(event) => setDetailUser({ ...detailUser, role: event.target.value })}>
                    {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <label className="admin-modal__field">
                  <span>Department</span>
                  <select value={detailUser.departmentId || ''} onChange={(event) => setDetailUser({ ...detailUser, departmentId: Number(event.target.value) })}>
                    <option value="">Unassigned</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="admin-modal__field">
                <span>Account state</span>
                <label className="admin-toggle">
                  <input type="checkbox" checked={detailUser.isActive !== false} onChange={(event) => setDetailUser({ ...detailUser, isActive: event.target.checked })} />
                  Active account
                </label>
              </label>
              <div className="admin-modal__footer">
                <button className="secondary-button" onClick={() => setDetailUser(null)}>Cancel</button>
                <button className="primary-button" onClick={() => {
                  updateRole(detailUser.id, detailUser.role || 'Employee')
                  updateDepartment(detailUser.id, detailUser.departmentId || '')
                  toggleActive(detailUser.id, detailUser.isActive !== false)
                  setDetailUser(null)
                }}>Save changes</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
