import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAppDialog } from '../../components/common/useAppDialog';
import api from '../../services/api';

type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface EmailTemplateAction {
  id: number;
  actionType: string;
  recipientRole?: string | null;
  channel: string;
  priority: number;
  isActive: boolean;
}

interface EmailTemplate {
  id: number;
  key: string;
  name: string;
  category: string;
  subject: string;
  preheader?: string | null;
  html: string;
  text?: string | null;
  requiredVariables?: string[] | null;
  optionalVariables?: string[] | null;
  status: TemplateStatus;
  version: number;
  isDefault: boolean;
  actions?: EmailTemplateAction[];
}

interface TemplateForm {
  key: string;
  name: string;
  category: string;
  subject: string;
  preheader: string;
  html: string;
  text: string;
  requiredVariables: string;
  optionalVariables: string;
  status: TemplateStatus;
}

const emptyForm: TemplateForm = {
  key: '',
  name: '',
  category: 'GENERAL',
  subject: '',
  preheader: '',
  html: '',
  text: '',
  requiredVariables: '',
  optionalVariables: '',
  status: 'DRAFT',
};

const statusOptions: TemplateStatus[] = ['ACTIVE', 'DRAFT', 'INACTIVE', 'ARCHIVED'];

const getApiMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

const toList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const fromList = (value?: string[] | null) => (value || []).join(', ');

const detectVariables = (content: string) => {
  const found = new Set<string>();
  for (const match of content.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)) {
    found.add(match[1]);
  }
  return Array.from(found).sort();
};

const isFullHtmlDocument = (value: string) => /<\s*(html|body)(\s|>)/i.test(value || '');

const buildPreviewHtml = (subject: string, preheader: string, bodyContent: string) => {
  if (isFullHtmlDocument(bodyContent)) return bodyContent;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head><body style="margin:0;padding:0;background:#f4f1ea;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader || subject}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f1ea"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e7e2d6;border-radius:12px;overflow:hidden;"><tr><td style="background:#1a1714;padding:18px 28px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#fff;">BLITZ <span style="color:#b8924a;">NYC</span></span></td></tr><tr><td style="padding:30px 28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1714;">${bodyContent}<p style="margin:18px 0 0;font-size:15px;color:#1a1714;">- Blitz NYC</p></td></tr><tr><td style="background:#faf9f6;border-top:1px solid #e7e2d6;padding:20px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#6b6660;">You're receiving this because you have a Blitz NYC account.<br>Blitz NYC, LLC</td></tr></table></td></tr></table></body></html>`;
};

export default function EmailTemplatesPage() {
  const { showAlert, dialogNode } = useAppDialog();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TemplateStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [actionType, setActionType] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const detectedVariables = useMemo(
    () => detectVariables([form.subject, form.preheader, form.html, form.text].join('\n')),
    [form.subject, form.preheader, form.html, form.text],
  );

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/email-templates', {
        params: { limit: 100, search: search || undefined, status: status || undefined },
      });
      const rows = response.data?.data || [];
      setTemplates(rows);
      if (!selected && rows.length) selectTemplate(rows[0]);
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to load email templates.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, [status]);

  const selectTemplate = (template: EmailTemplate) => {
    setSelected(template);
    setForm({
      key: template.key,
      name: template.name,
      category: template.category,
      subject: template.subject,
      preheader: template.preheader || '',
      html: template.html,
      text: template.text || '',
      requiredVariables: fromList(template.requiredVariables),
      optionalVariables: fromList(template.optionalVariables),
      status: template.status,
    });
    setPreviewHtml('');
    setActionType('');
  };

  const syncDetectedVariables = () => {
    setForm((prev) => ({ ...prev, requiredVariables: detectedVariables.join(', ') }));
  };

  const startNew = () => {
    setSelected(null);
    setForm(emptyForm);
    setPreviewHtml('');
    setActionType('');
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        requiredVariables: toList(form.requiredVariables),
        optionalVariables: toList(form.optionalVariables),
      };
      const response = selected
        ? await api.patch(`/email-templates/${selected.id}`, payload)
        : await api.post('/email-templates', payload);
      showAlert('Email template saved.', { variant: 'success' });
      selectTemplate(response.data);
      await loadTemplates();
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to save email template.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const previewTemplate = async () => {
    if (!selected) {
      showAlert('Save the template before previewing it.', { variant: 'warning' });
      return;
    }
    try {
      const response = await api.post(`/email-templates/${selected.id}/preview`, {});
      setPreviewHtml(response.data?.html || '');
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to preview email template.'), { variant: 'error' });
    }
  };

  const archiveTemplate = async () => {
    if (!selected) return;
    try {
      await api.delete(`/email-templates/${selected.id}`);
      showAlert('Email template archived.', { variant: 'success' });
      setSelected(null);
      setForm(emptyForm);
      await loadTemplates();
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to archive email template.'), { variant: 'error' });
    }
  };

  const cloneTemplate = async () => {
    if (!selected) return;
    try {
      const response = await api.post(`/email-templates/${selected.id}/clone`, {});
      showAlert('Template cloned as a draft.', { variant: 'success' });
      selectTemplate(response.data);
      await loadTemplates();
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to clone email template.'), { variant: 'error' });
    }
  };

  const testSendTemplate = async () => {
    if (!selected || !testEmail.trim()) {
      showAlert('Enter a test email address first.', { variant: 'warning' });
      return;
    }
    try {
      await api.post(`/email-templates/${selected.id}/test-send`, { to: testEmail.trim() });
      showAlert('Test email sent.', { variant: 'success' });
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to send test email.'), { variant: 'error' });
    }
  };

  const addAction = async () => {
    if (!selected || !actionType.trim()) return;
    try {
      await api.post('/email-templates/actions', { templateId: selected.id, actionType: actionType.trim(), channel: 'EMAIL' });
      showAlert('Action mapping added.', { variant: 'success' });
      const response = await api.get(`/email-templates/${selected.id}`);
      selectTemplate(response.data);
      await loadTemplates();
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to add action mapping.'), { variant: 'error' });
    }
  };

  const removeAction = async (id: number) => {
    if (!selected) return;
    try {
      await api.delete(`/email-templates/actions/${id}`);
      showAlert('Action mapping removed.', { variant: 'success' });
      const response = await api.get(`/email-templates/${selected.id}`);
      selectTemplate(response.data);
      await loadTemplates();
    } catch (error) {
      showAlert(getApiMessage(error, 'Unable to remove action mapping.'), { variant: 'error' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-1 text-sm text-slate-500">Manage reusable email content by action, status, and version.</p>
        </div>
        <Button onClick={startNew}>New Template</Button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search templates" />
            <button type="button" onClick={() => void loadTemplates()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Go</button>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value as TemplateStatus | '')} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${selected?.id === template.id ? 'border-[#b8924a] bg-[#fbf7ef]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{template.name}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">v{template.version}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{template.key}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-[11px] font-semibold text-[#7c6232]">{template.category}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{template.status}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Key" value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="order_shipped" />
            <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Order shipped" />
            <Input label="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="ORDER" />
            <div>
              <label className="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.17em] text-[#7e7368]">Status</label>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TemplateStatus })} className="w-full rounded-2xl border border-[#ddd3c7] bg-[#f3efea] px-4 py-3 text-sm font-semibold text-[#251d17]">
                {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Input label="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="{{title}}" /></div>
            <div className="md:col-span-2"><Input label="Preheader" value={form.preheader} onChange={(event) => setForm({ ...form, preheader: event.target.value })} placeholder="Short preview line" /></div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.17em] text-[#7e7368]">Body Content</label>
              <textarea value={form.html} onChange={(event) => setForm({ ...form, html: event.target.value })} rows={14} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" placeholder="Body content only, for example: <h1>{{title}}</h1><p>{{message}}</p>" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.17em] text-[#7e7368]">Text Fallback</label>
              <textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} rows={4} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <Input label="Required Variables" value={form.requiredVariables} onChange={(event) => setForm({ ...form, requiredVariables: event.target.value })} placeholder="title, message" />
            <Input label="Optional Variables" value={form.optionalVariables} onChange={(event) => setForm({ ...form, optionalVariables: event.target.value })} placeholder="action_url" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {detectedVariables.map((variable) => <span key={variable} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{`{{${variable}}}`}</span>)}
            {detectedVariables.length ? <button type="button" onClick={syncDetectedVariables} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50">Use detected as required</button> : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
            <Button onClick={saveTemplate} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</Button>
            <Button type="button" variant="secondary" onClick={previewTemplate}>Preview</Button>
            {selected ? <Button type="button" variant="secondary" onClick={cloneTemplate}>Clone</Button> : null}
            {selected ? <Button type="button" variant="danger" onClick={archiveTemplate}>Archive</Button> : null}
          </div>

          {selected ? (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h2 className="text-sm font-bold text-slate-900">Test Send</h2>
              <div className="mt-3 flex gap-2">
                <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="name@example.com" />
                <button type="button" onClick={testSendTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Send</button>
              </div>
            </div>
          ) : null}

          {selected ? (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h2 className="text-sm font-bold text-slate-900">Action Mappings</h2>
              <div className="mt-3 flex gap-2">
                <input value={actionType} onChange={(event) => setActionType(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="ORDER_SHIPPED" />
                <button type="button" onClick={addAction} className="rounded-lg bg-[#1a1714] px-3 py-2 text-sm font-bold text-white">Add</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selected.actions || []).map((action) => (
                  <button key={action.id} type="button" onClick={() => void removeAction(action.id)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-600">
                    {action.actionType} x
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Preview</h2>
            {selected ? <span className="text-xs font-semibold text-slate-500">{selected.key}</span> : null}
          </div>
          <iframe title="Email template preview" srcDoc={previewHtml || buildPreviewHtml(form.subject, form.preheader, form.html)} className="h-[760px] w-full rounded-lg border border-slate-200 bg-[#f4f1ea]" />
        </section>
      </div>
      {dialogNode}
    </div>
  );
}