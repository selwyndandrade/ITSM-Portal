import React, { useEffect, useMemo, useState } from 'react'
import { createAutomationRule, deleteAutomationRule, getAutomationExecutions, getAutomationRules, testAutomationRule, updateAutomationRule } from '../services/automationService'

const createEmptyRule = () => ({
  name: '',
  description: '',
  triggerType: 'TicketCreated',
  triggerValue: '',
  conditions: [{ field: 'priority', operator: 'equals', value: 'Critical' }],
  actions: [{ type: 'assign', value: '', target: '', message: '' }],
  isActive: true
})

const triggerOptions = [
  { value: 'TicketCreated', label: 'Ticket Created', helper: 'Starts when a new ticket is created by a requester.' },
  { value: 'TicketUpdated', label: 'Ticket Updated', helper: 'Runs after a ticket is changed or commented on.' },
  { value: 'TicketStatusChanged', label: 'Ticket Status Changed', helper: 'Activates when the ticket moves between statuses.' },
  { value: 'ServiceRequestSubmitted', label: 'Service Request Submitted', helper: 'Starts when a catalog request is submitted.' },
  { value: 'ServiceRequestApproved', label: 'Service Request Approved', helper: 'Runs once an approval is granted.' },
  { value: 'ServiceRequestRejected', label: 'Service Request Rejected', helper: 'Runs when an approval is rejected.' },
  { value: 'AssetAssigned', label: 'Asset Assigned', helper: 'Triggers when an asset is assigned to a user or team.' },
  { value: 'SlaWarning', label: 'SLA Warning', helper: 'Runs before an SLA is breached to warn stakeholders.' },
  { value: 'SlaBreached', label: 'SLA Breached', helper: 'Runs when service response targets have been missed.' }
]

const conditionFields = [
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'category', label: 'Category' },
  { value: 'department', label: 'Department' },
  { value: 'title', label: 'Title' },
  { value: 'approvalstatus', label: 'Approval Status' },
  { value: 'servicerequeststatus', label: 'Service Request Status' }
]

const actionDefinitions = [
  { value: 'assign', label: 'Assign ticket', helper: 'Route the ticket to a user or team.', group: 'Tickets' },
  { value: 'set-status', label: 'Change status', helper: 'Move the record into a different lifecycle state.', group: 'Tickets' },
  { value: 'set-priority', label: 'Change priority', helper: 'Raise or lower urgency for the record.', group: 'Tickets' },
  { value: 'escalate', label: 'Escalate ticket', helper: 'Send the record to a higher support tier.', group: 'Tickets' },
  { value: 'add-internal-note', label: 'Add internal note', helper: 'Write a note that stays inside the case history.', group: 'Tickets' },
  { value: 'notify-requester', label: 'Notify requester', helper: 'Send a message to the requester.', group: 'Notifications' },
  { value: 'notify-manager', label: 'Notify manager', helper: 'Send a message to the service manager.', group: 'Notifications' },
  { value: 'notify-assigned-technician', label: 'Notify technician', helper: 'Send a message to the owning technician.', group: 'Notifications' },
  { value: 'create-approval-record', label: 'Create approval record', helper: 'Kick off an approval workflow for the request.', group: 'Service Requests' },
  { value: 'assign-approval-group', label: 'Assign approval group', helper: 'Route approvals to a team or group.', group: 'Service Requests' },
  { value: 'set-approval-status', label: 'Update approval status', helper: 'Update the approval state on the request.', group: 'Service Requests' },
  { value: 'create-follow-up-ticket', label: 'Create follow-up ticket', helper: 'Open a new child ticket for follow-up work.', group: 'Automation' }
]

const operatorOptions = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startswith', label: 'Starts with' },
  { value: 'endswith', label: 'Ends with' }
]

const stepLabels = [
  { title: 'When', subtitle: 'Choose the trigger event' },
  { title: 'If', subtitle: 'Define the decision criteria' },
  { title: 'Then', subtitle: 'Pick the actions to run' },
  { title: 'Review', subtitle: 'Validate and save the workflow' }
]

function formatRulePreview(rule) {
  const conditions = (rule.conditions || []).map((condition) => `${condition.field || 'field'} ${condition.operator || 'equals'} ${condition.value || 'value'}`).join(' AND ')
  const actions = (rule.actions || []).map((action) => action.type || 'action').join(' → ')
  return `${rule.name || 'Untitled rule'}: ${conditions || 'No conditions'} → ${actions || 'No actions'}`
}

function getRuleStatus(rule) {
  if (!rule || (!rule.id && !rule.isActive)) return 'Draft'
  return rule.isActive ? 'Active' : 'Disabled'
}

export default function AutomationRules() {
  const [rules, setRules] = useState([])
  const [executions, setExecutions] = useState([])
  const [draft, setDraft] = useState(createEmptyRule())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [testingTicketId, setTestingTicketId] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  async function loadRules() {
    setLoading(true)
    try {
      const [ruleData, executionData] = await Promise.all([getAutomationRules(), getAutomationExecutions()])
      setRules(ruleData || [])
      setExecutions((Array.isArray(executionData) ? executionData : executionData?.items) || [])
    } catch (ex) {
      setError('Unable to load automation rules right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rules.filter((rule) => {
      const matchesSearch = !query || `${rule.name} ${rule.description || ''} ${rule.triggerType} ${(rule.conditions || []).map((condition) => condition.value).join(' ')}`.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? rule.isActive : !rule.isActive)
      return matchesSearch && matchesStatus
    })
  }, [rules, search, statusFilter])

  const validationMessages = useMemo(() => {
    const messages = []
    if (!draft.name.trim()) {
      messages.push('Give the workflow a clear name before saving.')
    }

    if (!draft.triggerType) {
      messages.push('Choose a trigger event for the workflow.')
    }

    if (!draft.conditions.length) {
      messages.push('Add at least one IF condition before saving.')
    }

    draft.conditions.forEach((condition, index) => {
      if (!condition.field || !condition.operator || !condition.value) {
        messages.push(`Condition ${index + 1} needs a field, operator, and value.`)
      }
    })

    if (!draft.actions.length) {
      messages.push('Add at least one THEN action before saving.')
    }

    draft.actions.forEach((action, index) => {
      if (!action.type) {
        messages.push(`Action ${index + 1} needs a selected action type.`)
        return
      }

      if (action.type === 'assign' && !action.target.trim()) {
        messages.push(`Action ${index + 1} needs a target assignee or team.`)
      }

      if (['set-status', 'set-priority', 'add-internal-note'].includes(action.type) && !action.value.trim()) {
        messages.push(`Action ${index + 1} needs a value for the chosen action.`)
      }

      if (['notify-requester', 'notify-manager', 'notify-assigned-technician'].includes(action.type) && !action.message.trim()) {
        messages.push(`Action ${index + 1} should include a message for the notification.`)
      }
    })

    return messages
  }, [draft])

  const currentStepMessages = useMemo(() => {
    switch (currentStep) {
      case 0:
        return validationMessages.filter((message) => message.includes('name') || message.includes('trigger'))
      case 1:
        return validationMessages.filter((message) => message.includes('condition'))
      case 2:
        return validationMessages.filter((message) => message.includes('action'))
      default:
        return validationMessages
    }
  }, [currentStep, validationMessages])

  async function handleSubmit(event) {
    event.preventDefault()
    if (validationMessages.length) {
      setError('Complete the highlighted workflow details before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await updateAutomationRule(editingId, { ...draft, id: editingId })
      } else {
        await createAutomationRule({ ...draft })
      }
      setDraft(createEmptyRule())
      setEditingId(null)
      setCurrentStep(0)
      await loadRules()
    } catch (ex) {
      setError('The rule could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(rule) {
    setEditingId(rule.id)
    setDraft({
      ...rule,
      name: rule.name || '',
      description: rule.description || '',
      triggerType: rule.triggerType || 'TicketCreated',
      triggerValue: rule.triggerValue || '',
      conditions: rule.conditions || [{ field: 'priority', operator: 'equals', value: '' }],
      actions: rule.actions || [{ type: 'assign', value: '', target: '', message: '' }],
      isActive: rule.isActive !== undefined ? rule.isActive : true
    })
    setCurrentStep(0)
    setError('')
  }

  function handleDuplicate(rule) {
    setDraft({
      ...rule,
      id: undefined,
      name: `${rule.name} (Copy)`,
      description: rule.description || '',
      triggerType: rule.triggerType || 'TicketCreated',
      triggerValue: rule.triggerValue || '',
      conditions: rule.conditions || [{ field: 'priority', operator: 'equals', value: '' }],
      actions: rule.actions || [{ type: 'assign', value: '', target: '', message: '' }],
      isActive: false
    })
    setEditingId(null)
    setCurrentStep(0)
    setError('')
  }

  async function handleToggle(rule) {
    try {
      await updateAutomationRule(rule.id, { ...rule, isActive: !rule.isActive })
      await loadRules()
    } catch (ex) {
      setError('The rule state could not be updated.')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAutomationRule(id)
      await loadRules()
    } catch (ex) {
      setError('The rule could not be deleted.')
    }
  }

  async function handleTestRule(rule) {
    try {
      const result = await testAutomationRule(rule, testingTicketId)
      setTestResult(result)
    } catch (ex) {
      setError('The rule test could not be executed.')
    }
  }

  function updateCondition(index, field, value) {
    const next = [...draft.conditions]
    next[index] = { ...next[index], [field]: value }
    setDraft({ ...draft, conditions: next })
  }

  function addCondition() {
    setDraft({ ...draft, conditions: [...draft.conditions, { field: 'priority', operator: 'equals', value: '' }] })
  }

  function removeCondition(index) {
    const next = draft.conditions.filter((_, itemIndex) => itemIndex !== index)
    setDraft({ ...draft, conditions: next })
  }

  function updateAction(index, field, value) {
    const next = [...draft.actions]
    next[index] = { ...next[index], [field]: value }
    setDraft({ ...draft, actions: next })
  }

  function addAction() {
    setDraft({ ...draft, actions: [...draft.actions, { type: 'notify-requester', value: '', target: '', message: '' }] })
  }

  function removeAction(index) {
    const next = draft.actions.filter((_, itemIndex) => itemIndex !== index)
    setDraft({ ...draft, actions: next })
  }

  const selectedTrigger = triggerOptions.find((option) => option.value === draft.triggerType) || triggerOptions[0]

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">AUTOMATION RULES</p>
          <h2>Enterprise workflow designer</h2>
          <p>Create and monitor ITSM workflows with the same clarity and structure as a modern ServiceNow-style flow builder.</p>
        </div>
      </div>

      {error ? <div className="dashboard-empty" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Workflow builder</p>
              <h2>{editingId ? 'Edit workflow rule' : 'Create a new workflow rule'}</h2>
            </div>
          </div>

          <div className="automation-steps" role="tablist" aria-label="Workflow steps">
            {stepLabels.map((step, index) => (
              <button
                key={step.title}
                type="button"
                className={`automation-steps__item ${currentStep === index ? 'is-active' : ''}`}
                onClick={() => setCurrentStep(index)}
              >
                <strong>{step.title}</strong>
                <span>{step.subtitle}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="asset-form">
            {currentStep === 0 ? (
              <div className="automation-card">
                <div className="automation-card__header">
                  <div>
                    <p className="dashboard-card__eyebrow">WHEN</p>
                    <h3>Choose the event that starts the workflow</h3>
                  </div>
                </div>
                <p className="automation-card__help">This is the trigger that launches the rule in the ITSM process.</p>
                <label>
                  Rule name
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Critical network escalation" />
                </label>
                <label>
                  Description
                  <textarea value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Describe the rule purpose" />
                </label>
                <label>
                  Trigger event
                  <select value={draft.triggerType} onChange={(event) => setDraft({ ...draft, triggerType: event.target.value })}>
                    {triggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <div className="automation-card__helper">
                  <strong>{selectedTrigger.label}</strong>
                  <p>{selectedTrigger.helper}</p>
                </div>
                <label>
                  Trigger value
                  <input value={draft.triggerValue || ''} onChange={(event) => setDraft({ ...draft, triggerValue: event.target.value })} placeholder="Optional trigger detail" />
                </label>
                {currentStepMessages.length ? <div className="automation-card__errors">{currentStepMessages[0]}</div> : null}
              </div>
            ) : null}

            {currentStep === 1 ? (
              <div className="automation-card">
                <div className="automation-card__header">
                  <div>
                    <p className="dashboard-card__eyebrow">IF</p>
                    <h3>Define the conditions that must be true</h3>
                  </div>
                </div>
                <p className="automation-card__help">These conditions are evaluated together so the rule only fires when the business logic matches.</p>
                {draft.conditions.map((condition, index) => (
                  <div key={`${condition.field}-${index}`} className="automation-card__block">
                    <div style={{ display: 'grid', gap: 8 }}>
                      <select value={condition.field} onChange={(event) => updateCondition(index, 'field', event.target.value)}>
                        {conditionFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
                      </select>
                      <select value={condition.operator} onChange={(event) => updateCondition(index, 'operator', event.target.value)}>
                        {operatorOptions.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                      </select>
                      <input value={condition.value} onChange={(event) => updateCondition(index, 'value', event.target.value)} placeholder="Value" />
                    </div>
                    <button type="button" className="theme-button theme-button--secondary" style={{ marginTop: 8 }} onClick={() => removeCondition(index)}>Remove condition</button>
                  </div>
                ))}
                <button type="button" className="theme-button theme-button--secondary" onClick={addCondition}>Add condition</button>
                {currentStepMessages.length ? <div className="automation-card__errors">{currentStepMessages[0]}</div> : null}
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="automation-card">
                <div className="automation-card__header">
                  <div>
                    <p className="dashboard-card__eyebrow">THEN</p>
                    <h3>Choose the actions that execute when the rule matches</h3>
                  </div>
                </div>
                <p className="automation-card__help">Each action adds operational follow-through for the case, request, asset, or notification.</p>
                {draft.actions.map((action, index) => {
                  const definition = actionDefinitions.find((item) => item.value === action.type) || actionDefinitions[0]
                  return (
                    <div key={`${action.type}-${index}`} className="automation-card__block">
                      <div style={{ display: 'grid', gap: 8 }}>
                        <select value={action.type} onChange={(event) => updateAction(index, 'type', event.target.value)}>
                          {actionDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <div className="automation-card__helper">
                          <strong>{definition.label}</strong>
                          <p>{definition.helper}</p>
                        </div>
                        <input value={action.value || ''} onChange={(event) => updateAction(index, 'value', event.target.value)} placeholder="Action value" />
                        <input value={action.target || ''} onChange={(event) => updateAction(index, 'target', event.target.value)} placeholder="Target / group / assignee" />
                        <input value={action.message || ''} onChange={(event) => updateAction(index, 'message', event.target.value)} placeholder="Message / note" />
                      </div>
                      <button type="button" className="theme-button theme-button--secondary" style={{ marginTop: 8 }} onClick={() => removeAction(index)}>Remove action</button>
                    </div>
                  )
                })}
                <button type="button" className="theme-button theme-button--secondary" onClick={addAction}>Add action</button>
                {currentStepMessages.length ? <div className="automation-card__errors">{currentStepMessages[0]}</div> : null}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="automation-card">
                <div className="automation-card__header">
                  <div>
                    <p className="dashboard-card__eyebrow">REVIEW</p>
                    <h3>Preview the finished workflow</h3>
                  </div>
                </div>
                <p className="automation-card__help">This summary is designed to be readable for ITSM admins and support leads.</p>
                <div className="automation-preview">
                  <div className="automation-preview__pill">WHEN</div>
                  <div><strong>{selectedTrigger.label}</strong></div>
                  <div className="automation-preview__pill">IF</div>
                  <div>{draft.conditions.length ? draft.conditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(' • ') : 'No conditions yet'}</div>
                  <div className="automation-preview__pill">THEN</div>
                  <div>{draft.actions.length ? draft.actions.map((action) => action.type).join(' → ') : 'No actions yet'}</div>
                </div>
                <div className="automation-card__helper">
                  <strong>Readable summary</strong>
                  <p>{`When ${selectedTrigger.label.toLowerCase()}, if ${draft.conditions.length ? draft.conditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(' and ') : 'the required conditions are met'}, then ${draft.actions.length ? draft.actions.map((action) => action.type).join(' and ') : 'no actions are defined'}.`}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
                  <span>Enable workflow immediately</span>
                </label>
                {validationMessages.length ? <div className="automation-card__errors">{validationMessages[0]}</div> : null}
              </div>
            ) : null}

            <div className="automation-actions">
              <button type="button" className="theme-button theme-button--secondary" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>Back</button>
              <button type="button" className="theme-button theme-button--secondary" onClick={() => setCurrentStep(Math.min(3, currentStep + 1))} disabled={currentStep === 3}>Next</button>
              <button type="submit" className="theme-button" disabled={saving || validationMessages.length > 0}>{saving ? 'Saving…' : editingId ? 'Update rule' : 'Save rule'}</button>
              {editingId ? <button type="button" className="theme-button theme-button--secondary" onClick={() => { setEditingId(null); setDraft(createEmptyRule()); setCurrentStep(0); setError('') }}>Cancel</button> : null}
            </div>
          </form>
        </div>

        <div className="dashboard-card" style={{ minWidth: 0 }}>
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Admin console</p>
              <h2>Workflow inventory</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 10 }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workflows" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All workflows</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {loading ? <div className="dashboard-empty">Loading automation console…</div> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredRules.length ? filteredRules.map((rule) => {
                const ruleStatus = getRuleStatus(rule)
                const ruleExecutions = executions.filter((entry) => entry.ruleId === rule.id || entry.ruleName === rule.name)
                const latestExecution = [...ruleExecutions].sort((left, right) => new Date(right.triggeredAt) - new Date(left.triggeredAt))[0]
                const successCount = ruleExecutions.filter((entry) => entry.status && entry.status.toLowerCase() === 'success').length
                const failureCount = ruleExecutions.filter((entry) => ['failed', 'error', 'cancelled'].includes((entry.status || '').toLowerCase())).length

                return (
                  <div key={rule.id} className="automation-rule-card">
                    <div className="automation-rule-card__top">
                      <div>
                        <div className={`status-badge status-badge--${ruleStatus.toLowerCase()}`}>{ruleStatus}</div>
                        <div className="automation-rule-card__title">{rule.name}</div>
                        {rule.description ? <div className="automation-rule-card__description">{rule.description}</div> : null}
                      </div>
                      <div className="automation-rule-card__meta">
                        <div>{rule.triggerType}</div>
                        <div>{rule.isActive ? 'Live' : 'Paused'}</div>
                      </div>
                    </div>
                    <div className="automation-rule-card__summary">{(rule.conditions || []).map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(' • ') || 'No conditions'}</div>
                    <div className="automation-rule-card__summary">{(rule.actions || []).map((action) => action.type).join(' → ') || 'No actions'}</div>

                    <div className="automation-rule-card__stats">
                      <div>
                        <span>Runs</span>
                        <strong>{ruleExecutions.length}</strong>
                      </div>
                      <div>
                        <span>Success</span>
                        <strong>{successCount}</strong>
                      </div>
                      <div>
                        <span>Failures</span>
                        <strong>{failureCount}</strong>
                      </div>
                      <div>
                        <span>Last</span>
                        <strong>{latestExecution ? new Date(latestExecution.triggeredAt).toLocaleString() : 'No runs yet'}</strong>
                      </div>
                    </div>

                    <div className="automation-rule-card__actions">
                      <button type="button" className="theme-button theme-button--secondary" onClick={() => handleToggle(rule)}>{rule.isActive ? 'Disable' : 'Enable'}</button>
                      <button type="button" className="theme-button theme-button--secondary" onClick={() => startEdit(rule)}>Edit</button>
                      <button type="button" className="theme-button theme-button--secondary" onClick={() => handleDuplicate(rule)}>Duplicate</button>
                      <button type="button" className="theme-button" onClick={() => handleDelete(rule.id)}>Delete</button>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <input value={testingTicketId} onChange={(event) => setTestingTicketId(event.target.value)} placeholder="Ticket ID" style={{ width: 140, marginRight: 8 }} />
                      <button type="button" className="theme-button theme-button--secondary" onClick={() => handleTestRule(rule)}>Test rule</button>
                    </div>
                    {testResult && testResult.ruleId === rule.id ? <div className="dashboard-empty" style={{ marginTop: 8 }}>{testResult.summary}</div> : null}
                  </div>
                )
              }) : <div className="dashboard-empty">No automation rules configured yet.</div>}
            </div>
          )}

          <div className="dashboard-card__header" style={{ marginTop: 16 }}>
            <div>
              <p className="dashboard-card__eyebrow">Execution history</p>
              <h3>Recent runs</h3>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {executions.length ? executions.map((execution) => (
              <div key={execution.id} className="ticket-comment-item">
                <div className="ticket-comment-meta">{execution.triggerEvent} • {execution.status}</div>
                <div><strong>{execution.ruleName}</strong></div>
                <div>{execution.message}</div>
                <div>{new Date(execution.triggeredAt).toLocaleString()}</div>
              </div>
            )) : <div className="dashboard-empty">No execution history yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
