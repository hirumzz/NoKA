import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Save,
  Clock,
  Bell,
  Shield,
  Users,
  Settings as SettingsIcon,
  CheckSquare,
  Check,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailTransport = 'smtp' | 'sendmail' | 'mailgun';

interface ResourcePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

type ResourceKey =
  | 'APIS'
  | 'SERVICES'
  | 'ROUTES'
  | 'CONSUMERS'
  | 'PLUGINS'
  | 'UPSTREAMS'
  | 'CERTIFICATES'
  | 'CONNECTIONS'
  | 'USERS';

const RESOURCES: ResourceKey[] = [
  'APIS',
  'SERVICES',
  'ROUTES',
  'CONSUMERS',
  'PLUGINS',
  'UPSTREAMS',
  'CERTIFICATES',
  'CONNECTIONS',
  'USERS',
];

type PermissionsMap = Record<ResourceKey, ResourcePermissions>;

const DEFAULT_PERMISSIONS: PermissionsMap = RESOURCES.reduce((acc, r) => {
  acc[r] = { create: false, read: true, update: false, delete: false };
  return acc;
}, {} as PermissionsMap);

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-emerald-600 text-white rounded-lg shadow-xl text-sm font-semibold">
    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
      <Check className="w-3 h-3" />
    </div>
    {message}
    <button
      onClick={onClose}
      className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

// ─── Section Card ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children }) => (
  <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border-light bg-slate-50/60">
      <span className="text-brand-primary">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─── Field Row ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 py-4 border-b border-border-light last:border-b-0">
    <div className="sm:w-64 flex-shrink-0">
      <label className="block text-xs font-bold text-text-primary">{label}</label>
      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{description}</p>
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

// ─── Checkbox Row ──────────────────────────────────────────────────────────────

interface CheckboxRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-start gap-4 py-4 border-b border-border-light last:border-b-0">
    <div className="mt-0.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
          checked
            ? 'bg-brand-primary border-brand-primary text-white'
            : 'border-border-light bg-white hover:border-brand-primary/60'
        }`}
      >
        {checked && <Check className="w-3 h-3" />}
      </button>
    </div>
    <div>
      <span className="block text-xs font-bold text-text-primary">{label}</span>
      <span className="block text-[11px] text-text-muted mt-0.5 leading-relaxed">{description}</span>
    </div>
  </div>
);

// ─── Transport Card ────────────────────────────────────────────────────────────

interface TransportCardProps {
  id: EmailTransport;
  name: string;
  description: string;
  active: boolean;
  onSelect: (id: EmailTransport) => void;
}

const TransportCard: React.FC<TransportCardProps> = ({ id, name, description, active, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    className={`flex-1 min-w-[140px] flex flex-col items-start gap-1.5 p-4 rounded-lg border-2 text-left transition-all ${
      active
        ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
        : 'border-border-light bg-white hover:border-brand-primary/40 hover:bg-slate-50/50'
    }`}
  >
    <div className="flex items-center justify-between w-full">
      <span
        className={`text-xs font-bold uppercase tracking-wider ${
          active ? 'text-brand-primary' : 'text-text-primary'
        }`}
      >
        {name}
      </span>
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          active ? 'border-brand-primary' : 'border-border-light'
        }`}
      >
        {active && <div className="w-2 h-2 rounded-full bg-brand-primary" />}
      </div>
    </div>
    <p className="text-[11px] text-text-muted leading-relaxed">{description}</p>
  </button>
);

// ─── Permission Checkbox Cell ──────────────────────────────────────────────────

interface PermCellProps {
  checked: boolean;
  onChange: () => void;
  colorClass: string;
}

const PermCell: React.FC<PermCellProps> = ({ checked, onChange, colorClass }) => (
  <td className="px-4 py-3 text-center">
    <button
      type="button"
      onClick={onChange}
      className={`mx-auto w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
        checked
          ? `${colorClass} text-white border-transparent`
          : 'border-border-light bg-white hover:border-brand-primary/40'
      }`}
    >
      {checked && <Check className="w-3 h-3" />}
    </button>
  </td>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  // ── General ──
  const [refreshInterval, setRefreshInterval] = useState('30000');
  const [baseUrl, setBaseUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');

  // ── Sign Up ──
  const [allowSignup, setAllowSignup] = useState(true);
  const [sendActivationEmail, setSendActivationEmail] = useState(true);

  // ── Notifications ──
  const [notifTab, setNotifTab] = useState<'email' | '3rd'>('email');
  const [emailSenderName, setEmailSenderName] = useState('NOKA');
  const [emailSenderAddress, setEmailSenderAddress] = useState('noka@noka.test');
  const [emailTransport, setEmailTransport] = useState<EmailTransport>('sendmail');
  const [notifyNodeDown, setNotifyNodeDown] = useState(false);
  const [notifyApiDown, setNotifyApiDown] = useState(false);

  // ── Permissions ──
  const [permissions, setPermissions] = useState<PermissionsMap>(DEFAULT_PERMISSIONS);

  // ── Toast ──
  const [toastVisible, setToastVisible] = useState(false);

  // ─── Load from localStorage ──────────────────────────────────────────────────

  useEffect(() => {
    const ri = localStorage.getItem('noka_refresh_interval');
    if (ri !== null) setRefreshInterval(ri);

    const bu = localStorage.getItem('noka_base_url');
    if (bu !== null) setBaseUrl(bu);

    const pu = localStorage.getItem('noka_proxy_url');
    if (pu !== null) setProxyUrl(pu);

    const as = localStorage.getItem('noka_allow_signup');
    if (as !== null) setAllowSignup(as === 'true');

    const sae = localStorage.getItem('noka_send_activation_email');
    if (sae !== null) setSendActivationEmail(sae === 'true');

    const esn = localStorage.getItem('noka_email_sender_name');
    if (esn !== null) setEmailSenderName(esn);

    const esa = localStorage.getItem('noka_email_sender_address');
    if (esa !== null) setEmailSenderAddress(esa);

    const et = localStorage.getItem('noka_email_transport');
    if (et !== null) setEmailTransport(et as EmailTransport);

    const nnd = localStorage.getItem('noka_notify_node_down');
    if (nnd !== null) setNotifyNodeDown(nnd === 'true');

    const nad = localStorage.getItem('noka_notify_api_down');
    if (nad !== null) setNotifyApiDown(nad === 'true');

    const perm = localStorage.getItem('noka_permissions');
    if (perm) {
      try {
        setPermissions({ ...DEFAULT_PERMISSIONS, ...JSON.parse(perm) });
      } catch {
        /* ignore parse errors */
      }
    }
  }, []);

  // ─── Save to localStorage ────────────────────────────────────────────────────

  const handleSave = async () => {
    localStorage.setItem('noka_refresh_interval', refreshInterval);
    localStorage.setItem('noka_base_url', baseUrl);
    localStorage.setItem('noka_proxy_url', proxyUrl);
    localStorage.setItem('noka_allow_signup', String(allowSignup));
    localStorage.setItem('noka_send_activation_email', String(sendActivationEmail));
    localStorage.setItem('noka_email_sender_name', emailSenderName);
    localStorage.setItem('noka_email_sender_address', emailSenderAddress);
    localStorage.setItem('noka_email_transport', emailTransport);
    localStorage.setItem('noka_notify_node_down', String(notifyNodeDown));
    localStorage.setItem('noka_notify_api_down', String(notifyApiDown));
    localStorage.setItem('noka_permissions', JSON.stringify(permissions));

    try {
      await axios.post('/api/settings', {
        settings: {
          refreshInterval,
          baseUrl,
          proxyUrl,
          allowSignup,
          sendActivationEmail,
          emailSenderName,
          emailSenderAddress,
          emailTransport,
          notifyNodeDown,
          notifyApiDown,
          permissions
        }
      }, { withCredentials: true });
    } catch (err) {
      console.error("Failed to save settings to backend", err);
    }

    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  };

  // ─── Permission toggle helper ────────────────────────────────────────────────

  const togglePerm = useCallback(
    (resource: ResourceKey, action: keyof ResourcePermissions) => {
      setPermissions((prev) => ({
        ...prev,
        [resource]: {
          ...prev[resource],
          [action]: !prev[resource][action],
        },
      }));
    },
    []
  );

  // ─── Permission color map ────────────────────────────────────────────────────

  const permColors: Record<keyof ResourcePermissions, string> = {
    create: 'bg-emerald-500',
    read: 'bg-blue-500',
    update: 'bg-amber-500',
    delete: 'bg-red-500',
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastVisible && (
        <Toast
          message="Settings saved successfully!"
          onClose={() => setToastVisible(false)}
        />
      )}

      {/* ── Page Header ── */}
      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-brand-primary/10 text-brand-primary flex-shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">Settings</h2>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed max-w-2xl">
              Configure application preferences, signup restrictions, notifications and user permissions.
            </p>
          </div>
        </div>
      </div>

      {/* ── General Settings ── */}
      <SectionCard icon={<Clock className="w-4 h-4" />} title="General Settings">
        <FieldRow
          label="Dashboard Refresh Interval (ms)"
          description="The interval in milliseconds at which the Dashboard data will refresh. If set to 0, polling will be disabled."
        >
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
            min={0}
            step={1000}
            className="w-full max-w-xs px-3 py-2 border border-border-light rounded text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
            placeholder="30000"
          />
        </FieldRow>
        <FieldRow
          label="Base URL"
          description="NOKA uses the Base URL for generating links (ex. Account activation links). If left blank, the server IP:port will be used."
        >
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-border-light rounded text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
            placeholder="ex. http://my-konga.io"
          />
        </FieldRow>
        <FieldRow
          label="Kong Proxy URL"
          description="The default Proxy URL NOKA uses to check the reachability of your Kong routes. (e.g., http://your-kong-gateway:8000)"
        >
          <input
            type="text"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-border-light rounded text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
            placeholder="ex. http://10.0.0.1:8000"
          />
        </FieldRow>
      </SectionCard>

      {/* ── Sign Up Restrictions ── */}
      <SectionCard icon={<Users className="w-4 h-4" />} title="Sign Up Restrictions">
        <CheckboxRow
          label="Allow users to sign up."
          description="If enabled, users will be allowed to sign up."
          checked={allowSignup}
          onChange={setAllowSignup}
        />
        <CheckboxRow
          label="Send activation email."
          description="If enabled, an activation email will be sent to the user. If not, the user will be activated automatically."
          checked={sendActivationEmail}
          onChange={setSendActivationEmail}
        />
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard icon={<Bell className="w-4 h-4" />} title="Notifications">
        {/* Tab bar */}
        <div className="flex gap-0 border border-border-light rounded-lg overflow-hidden w-fit mb-6">
          <button
            type="button"
            onClick={() => setNotifTab('email')}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              notifTab === 'email'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setNotifTab('3rd')}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border-l border-border-light transition-colors ${
              notifTab === '3rd'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            3rd-Party Integrations
          </button>
        </div>

        {notifTab === 'email' ? (
          <div>
            {/* Sender details */}
            <FieldRow
              label="Default Sender Name"
              description="The name that will appear as the sender in outgoing emails."
            >
              <input
                type="text"
                value={emailSenderName}
                onChange={(e) => setEmailSenderName(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-border-light rounded text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                placeholder="NOKA"
              />
            </FieldRow>
            <FieldRow
              label="Default Sender Address"
              description="The email address that will appear as the sender of outgoing emails."
            >
              <input
                type="email"
                value={emailSenderAddress}
                onChange={(e) => setEmailSenderAddress(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-border-light rounded text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                placeholder="noka@noka.test"
              />
            </FieldRow>

            {/* Transport selector */}
            <div className="py-4 border-b border-border-light">
              <p className="text-xs font-bold text-text-primary mb-1">Transports</p>
              <p className="text-[11px] text-text-muted mb-4">
                Choose the transport mechanism used to deliver outgoing emails.
              </p>
              <div className="flex flex-wrap gap-3">
                <TransportCard
                  id="smtp"
                  name="SMTP"
                  description="Send emails using the SMTP protocol."
                  active={emailTransport === 'smtp'}
                  onSelect={setEmailTransport}
                />
                <TransportCard
                  id="sendmail"
                  name="SENDMAIL"
                  description="Pipe messages to the sendmail command."
                  active={emailTransport === 'sendmail'}
                  onSelect={setEmailTransport}
                />
                <TransportCard
                  id="mailgun"
                  name="MAILGUN"
                  description="Send emails through Mailgun's Web API."
                  active={emailTransport === 'mailgun'}
                  onSelect={setEmailTransport}
                />
              </div>
            </div>

            {/* Notify admins */}
            <div className="pt-4">
              <p className="text-xs font-bold text-text-primary mb-3">Notify Administrators when</p>
              <CheckboxRow
                label="A node is down or unresponsive"
                description="Health checks must be enabled for the nodes that need to be monitored."
                checked={notifyNodeDown}
                onChange={setNotifyNodeDown}
              />
              <CheckboxRow
                label="An API is down or unresponsive"
                description="Health checks must be enabled for the APIs that need to be monitored."
                checked={notifyApiDown}
                onChange={setNotifyApiDown}
              />
            </div>
          </div>
        ) : (
          /* 3rd-party tab placeholder */
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="p-3 rounded-full bg-slate-100 text-text-muted">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-text-primary">Coming Soon</p>
            <p className="text-xs text-text-muted max-w-xs leading-relaxed">
              3rd-party integrations such as Slack, Hipchat etc. coming soon.
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── User Permissions ── */}
      <SectionCard icon={<Shield className="w-4 h-4" />} title="User Permissions">
        <p className="text-[11px] text-text-muted mb-5 leading-relaxed">
          Configure the default permissions assigned to non-admin users for each resource type.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border-light">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border-light">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Resource
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Create
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Read
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Update
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-red-700">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {RESOURCES.map((resource) => (
                <tr key={resource} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-indigo-50 text-brand-primary">
                        <CheckSquare className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">{resource}</span>
                    </div>
                  </td>
                  {(['create', 'read', 'update', 'delete'] as (keyof ResourcePermissions)[]).map(
                    (action) => (
                      <PermCell
                        key={action}
                        checked={permissions[resource][action]}
                        onChange={() => togglePerm(resource, action)}
                        colorClass={permColors[action]}
                      />
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {(
            [
              { label: 'Create', color: 'bg-emerald-500' },
              { label: 'Read', color: 'bg-blue-500' },
              { label: 'Update', color: 'bg-amber-500' },
              { label: 'Delete', color: 'bg-red-500' },
            ] as const
          ).map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded ${color}`} />
              <span className="text-[11px] text-text-muted font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Save Button ── */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-brand-primary text-white text-sm font-bold rounded-lg hover:bg-brand-primary/90 active:scale-[0.99] transition-all shadow-sm"
      >
        <Save className="w-4 h-4" />
        Save Settings
      </button>
    </div>
  );
};
