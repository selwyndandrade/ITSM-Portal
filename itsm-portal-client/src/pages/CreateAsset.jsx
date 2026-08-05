import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAsset } from '../services/assetService'

const statusOptions = ['Active', 'In Maintenance', 'Retired', 'Available', 'Deployed']
const categoryOptions = ['Hardware', 'Software', 'Network', 'Mobile', 'Accessory']

export default function CreateAsset() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    assetTag: '',
    name: '',
    description: '',
    category: 'Hardware',
    serialNumber: '',
    manufacturer: '',
    model: '',
    status: 'Active',
    assignedUserId: '',
    departmentId: '',
    purchaseDate: '',
    warrantyExpirationDate: '',
    location: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        assignedUserId: form.assignedUserId || null,
        purchaseDate: form.purchaseDate || null,
        warrantyExpirationDate: form.warrantyExpirationDate || null
      }
      const created = await createAsset(payload)
      navigate(`/assets/${created.id}`)
    } catch (ex) {
      setError('Unable to create asset right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="asset-form-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">NEW ASSET</p>
          <h2>Register a new asset</h2>
          <p>Capture ownership, service context, and lifecycle details from the start.</p>
        </div>
      </div>

      <form className="dashboard-card asset-form" onSubmit={handleSubmit}>
        <div className="asset-form__footer">
          <p className="dashboard-card__eyebrow" style={{ margin: 0 }}>Capture the details that matter for service delivery and ownership.</p>
        </div>
        {error && <div className="dashboard-empty" style={{ color: '#b00020' }}>{error}</div>}
        <div className="asset-form-grid">
          <label>Asset tag<input name="assetTag" value={form.assetTag} onChange={handleChange} required /></label>
          <label>Asset name<input name="name" value={form.name} onChange={handleChange} required /></label>
          <label>Category<select name="category" value={form.category} onChange={handleChange}>{categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Status<select name="status" value={form.status} onChange={handleChange}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Serial number<input name="serialNumber" value={form.serialNumber} onChange={handleChange} /></label>
          <label>Manufacturer<input name="manufacturer" value={form.manufacturer} onChange={handleChange} /></label>
          <label>Model<input name="model" value={form.model} onChange={handleChange} /></label>
          <label>Location<input name="location" value={form.location} onChange={handleChange} /></label>
          <label>Assigned user<input name="assignedUserId" value={form.assignedUserId} onChange={handleChange} /></label>
          <label>Department ID<input name="departmentId" type="number" value={form.departmentId} onChange={handleChange} /></label>
          <label>Purchase date<input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} /></label>
          <label>Warranty expiration<input name="warrantyExpirationDate" type="date" value={form.warrantyExpirationDate} onChange={handleChange} /></label>
        </div>
        <label>Description<textarea name="description" rows={4} value={form.description} onChange={handleChange} /></label>
        <label>Notes<textarea name="notes" rows={3} value={form.notes} onChange={handleChange} /></label>
        <div className="asset-form__footer">
          <span className="dashboard-empty" style={{ padding: 0 }}>Asset records will be available in the asset workspace immediately after creation.</span>
          <button type="submit" className="theme-button" disabled={loading}>{loading ? 'Saving...' : 'Create asset'}</button>
        </div>
      </form>
    </div>
  )
}
