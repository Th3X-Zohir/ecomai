import { useState, useEffect } from 'react';
import { adminTemplates } from '../api';
import {
  PageHeader, Card, Badge, Button, Modal, FormField, Input, Textarea,
  PageSkeleton, useToast,
} from '../components/UI';

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
    </label>
  );
}

const PLANS = ['free', 'starter', 'growth', 'enterprise'];

const PLAN_COLORS = { free: 'default', starter: 'info', growth: 'success', enterprise: 'purple' };

const TEMPLATE_PREVIEWS = {
  classic:       { bg: '#f8fafc', primary: '#2563eb', accent: '#3b82f6' },
  modern_luxe:   { bg: '#0a0a0a', primary: '#e3b341', accent: '#f5d060' },
  fresh_organic: { bg: '#fefdf8', primary: '#16a34a', accent: '#22c55e' },
  bold_pop:      { bg: '#ffffff', primary: '#f97316', accent: '#fb923c' },
  minimal_mono:  { bg: '#fafafa', primary: '#18181b', accent: '#71717a' },
  artisan_craft: { bg: '#fdf8f3', primary: '#b45309', accent: '#d97706' },
  tech_neon:     { bg: '#0f0f1a', primary: '#06b6d4', accent: '#22d3ee' },
  soft_pastel:   { bg: '#fdf2f8', primary: '#ec4899', accent: '#f472b6' },
};

function TemplateCard({ template, onEdit }) {
  const preview = TEMPLATE_PREVIEWS[template.template_id] || TEMPLATE_PREVIEWS.classic;
  const plans = template.available_plans || PLANS;

  return (
    <Card className="relative overflow-hidden" hover onClick={() => onEdit(template)}>
      {/* Color preview strip */}
      <div
        className="h-24 -mx-5 -mt-5 mb-4 flex items-end p-3"
        style={{ background: `linear-gradient(135deg, ${preview.bg} 0%, ${preview.primary}22 100%)` }}
      >
        <div className="flex gap-1.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-8 rounded"
              style={{
                width: `${20 + i * 8}px`,
                background: i % 2 === 0 ? preview.primary : preview.accent,
                opacity: 0.85 - i * 0.1,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{template.template_id}</p>
        </div>
        {template.is_featured && (
          <Badge variant="warning" size="sm">Featured</Badge>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {plans.map(plan => (
          <span
            key={plan}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: plan === 'free' ? '#f1f5f9' : plan === 'enterprise' ? '#f3e8ff' : '#ecfdf5',
              color: plan === 'enterprise' ? '#7c3aed' : plan === 'free' ? '#475569' : '#059669',
            }}
          >
            {plan}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {template.usage_count || 0} shop{(template.usage_count || 0) !== 1 ? 's' : ''} using
        </span>
        <span className={`text-xs font-medium ${template.is_active ? 'text-emerald-600' : 'text-red-400'}`}>
          {template.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </Card>
  );
}

function TemplateModal({ template, open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    available_plans: [...PLANS],
    is_featured: false,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && template) {
      setForm({
        name: template.name || '',
        description: template.description || '',
        available_plans: template.available_plans || [...PLANS],
        is_featured: template.is_featured || false,
        is_active: template.is_active !== false,
      });
    }
  }, [open, template]);

  const togglePlan = (plan) => {
    setForm(f => {
      const plans = f.available_plans.includes(plan)
        ? f.available_plans.filter(p => p !== plan)
        : [...f.available_plans, plan];
      return { ...f, available_plans: plans };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(template.id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit: ${template?.name}`} size="md">
      <div className="space-y-4">
        <FormField label="Display Name">
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Modern Luxe"
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description shown to merchants..."
            rows={2}
          />
        </FormField>

        <FormField label="Available Plans">
          <div className="flex flex-wrap gap-2">
            {PLANS.map(plan => (
              <button
                key={plan}
                type="button"
                onClick={() => togglePlan(plan)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.available_plans.includes(plan)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {plan}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Merchants on unselected plans won't see this template
          </p>
        </FormField>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Toggle
              checked={form.is_featured}
              onChange={v => setForm(f => ({ ...f, is_featured: v }))}
            />
            <span className="text-sm font-medium text-gray-700">Featured Template</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle
              checked={form.is_active}
              onChange={v => setForm(f => ({ ...f, is_active: v }))}
            />
            <span className="text-sm font-medium text-gray-700">
              {form.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={handleSave}>Save Changes</Button>
      </div>
    </Modal>
  );
}

function SectionRow({ section, onUpdate }) {
  const [active, setActive] = useState(section.is_active);

  const handleToggle = async () => {
    setActive(a => !a);
    await onUpdate(section.section_key, { is_active: !active });
  };

  return (
    <tr className={`border-b border-gray-100 ${!active ? 'opacity-50' : ''}`}>
      <td className="py-3 px-3">
        <span className="text-lg">{section.icon}</span>
      </td>
      <td className="py-3 px-3">
        <div className="font-medium text-gray-900 text-sm">{section.name}</div>
        <div className="text-xs text-gray-400">{section.section_key}</div>
      </td>
      <td className="py-3 px-3 hidden md:table-cell">
        <span className="text-sm text-gray-600 line-clamp-1 max-w-xs">{section.description}</span>
      </td>
      <td className="py-3 px-3">
        {section.is_core
          ? <Badge variant="default" size="sm">Core</Badge>
          : <Badge variant="outline" size="sm">Optional</Badge>
        }
      </td>
      <td className="py-3 px-3">
        <Toggle checked={active} onChange={handleToggle} size="sm" />
      </td>
    </tr>
  );
}

export default function TemplateSettings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadTemplates = () => {
    adminTemplates.listTemplates({ active_only: 'false' })
      .then(data => { setTemplates(data); })
      .catch(() => toast('Failed to load templates', 'error'))
      .finally(() => setLoading(false));
  };

  const loadSections = () => {
    adminTemplates.listSections({ active_only: 'false' })
      .then(data => { setSections(data); })
      .catch(() => toast('Failed to load sections', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'templates') {
      loadTemplates();
    } else {
      loadSections();
    }
  }, [activeTab]);

  const handleSaveTemplate = async (id, form) => {
    try {
      const updated = await adminTemplates.updateTemplate(id, form);
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, ...updated } : t));
      toast('Template updated successfully');
    } catch {
      toast('Failed to update template', 'error');
    }
  };

  const handleUpdateSection = async (sectionKey, patch) => {
    try {
      const updated = await adminTemplates.updateSection(sectionKey, patch);
      setSections(ss => ss.map(s => s.section_key === sectionKey ? { ...s, ...updated } : s));
      toast('Section updated');
    } catch {
      toast('Failed to update section', 'error');
    }
  };

  const featured = templates.filter(t => t.is_featured);
  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div>
      <PageHeader
        title="Template & Section Manager"
        description="Configure storefront templates and homepage section availability"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {['templates', 'sections'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'templates' ? (
        <div>
          {/* Summary bar */}
          <div className="flex gap-6 mb-6 p-4 bg-white rounded-xl border border-gray-200">
            <div>
              <div className="text-2xl font-bold text-gray-900">{activeTemplates.length}</div>
              <div className="text-xs text-gray-500">Active Templates</div>
            </div>
            <div className="border-l border-gray-200 pl-6">
              <div className="text-2xl font-bold text-gray-900">{templates.length}</div>
              <div className="text-xs text-gray-500">Total Templates</div>
            </div>
            <div className="border-l border-gray-200 pl-6">
              <div className="text-2xl font-bold text-amber-600">{featured.length}</div>
              <div className="text-xs text-gray-500">Featured</div>
            </div>
            <div className="border-l border-gray-200 pl-6">
              <div className="text-2xl font-bold text-gray-900">
                {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
              </div>
              <div className="text-xs text-gray-500">Total Shops Using</div>
            </div>
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {templates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={(template) => {
                  setEditTemplate(template);
                  setShowEditModal(true);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Homepage Sections</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Control which sections are available and visible to merchants
              </p>
            </div>
            <Badge variant="info">{sections.filter(s => s.is_active).length}/{sections.length} active</Badge>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Icon</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Section</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Type</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Active</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <SectionRow
                  key={section.section_key}
                  section={section}
                  onUpdate={handleUpdateSection}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showEditModal && editTemplate && (
        <TemplateModal
          template={editTemplate}
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setEditTemplate(null); }}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}
