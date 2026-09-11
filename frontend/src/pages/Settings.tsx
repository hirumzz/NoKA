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
  Send,
  MessageSquare,
  Globe,
  Hash,
  Share2,
  Play,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailTransport = 'smtp' | 'sendmail' | 'mailgun';

type IntegrationChannel = 'telegram' | 'whatsapp' | 'webhook' | 'slack' | 'discord';

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  threadId?: string;
}

interface WhatsAppConfig {
  enabled: boolean;
  serverUrl: string; // e.g. http://localhost:3000/api/sendText or WAHA endpoint
  apiKey?: string;
  session?: string;
  recipient: string; // Phone number or group jid
}

interface WebhookConfig {
  enabled: boolean;
  url: string;
  method: 'POST' | 'PUT';
  apiKey?: string;
  headersJson?: string;
}

interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel?: string;
}

interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
}

interface IntegrationsState {
  telegram: TelegramConfig;
  whatsapp: WhatsAppConfig;
  webhook: WebhookConfig;
  slack: SlackConfig;
  discord: DiscordConfig;
}

const DEFAULT_INTEGRATIONS: IntegrationsState = {
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    threadId: ''
  },
  whatsapp: {
    enabled: false,
    serverUrl: '',
    apiKey: '',
    session: 'default',
    recipient: ''
  },
  webhook: {
    enabled: false,
    url: '',
    method: 'POST',
    apiKey: '',
    headersJson: '{\n  "Content-Type": "application/json"\n}'
  },
  slack: {
    enabled: false,
    webhookUrl: '',
    channel: ''
  },
  discord: {
    enabled: false,
    webhookUrl: ''
  }
};

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
  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 animate-fadeIn">
    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    <span>{message}</span>
    <button
      type="button"
      onClick={onClose}
      className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ─── Section Card Wrapper ──────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children }) => (
  <div className="bg-white rounded-lg border border-border-light shadow-sm p-6 space-y-6">
    <div className="flex items-center gap-2.5 border-b border-border-light pb-4">
      <div className="p-2 rounded bg-indigo-50 text-brand-primary flex-shrink-0">{icon}</div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">{title}</h2>
    </div>
    {children}
  </div>
);

// ─── Reusable Form Row ─────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-3 border-b border-border-light last:border-0">
    <div className="max-w-md space-y-0.5">
      <label className="text-xs font-bold text-text-primary block">{label}</label>
      {description && <p className="text-[11px] text-text-muted leading-relaxed">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// ─── Reusable Checkbox Row ─────────────────────────────────────────────────────

interface CheckboxRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border-light last:border-0">
    <div className="space-y-0.5">
      <p className="text-xs font-bold text-text-primary">{label}</p>
      {description && <p className="text-[11px] text-text-muted leading-relaxed">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-brand-primary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
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

// ─── Anti-Inspect Secret Input ────────────────────────────────────────────────
interface AntiInspectSecretInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const AntiInspectSecretInput: React.FC<AntiInspectSecretInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter secret API key',
  className = ''
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isTampered, setIsTampered] = useState(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    // Active MutationObserver detecting unauthorized DOM attribute tampering in DevTools
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'type' || m.attributeName === 'value')) {
          const currentType = el.getAttribute('type');
          if (currentType !== 'password') {
            setIsTampered(true);
            el.setAttribute('type', 'text');
            el.value = '🖕';
          }
        }
      }
    });

    observer.observe(el, { attributes: true, attributeFilter: ['type', 'value'] });

    return () => observer.disconnect();
  }, []);

  return (
    <input
      ref={inputRef}
      type="password"
      value={isTampered ? '🖕' : value}
      onChange={(e) => {
        if (!isTampered) {
          onChange(e.target.value);
        }
      }}
      placeholder={placeholder}
      className={className}
      autoComplete="new-password"
      spellCheck={false}
    />
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const { addToast } = useToast();

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

  // ── 3rd-Party Integrations Hub ──
  const [selectedChannel, setSelectedChannel] = useState<IntegrationChannel>('telegram');
  const [integrations, setIntegrations] = useState<IntegrationsState>(DEFAULT_INTEGRATIONS);
  const [testingChannel, setTestingChannel] = useState(false);

  // ── Permissions ──
  const [permissions, setPermissions] = useState<PermissionsMap>(DEFAULT_PERMISSIONS);

  // ── Secret Field Masking Visibility ──
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showWhatsAppSession, setShowWhatsAppSession] = useState(false);
  const [showWebhookHeaders, setShowWebhookHeaders] = useState(false);
  const [showSlackUrl, setShowSlackUrl] = useState(false);
  const [showDiscordUrl, setShowDiscordUrl] = useState(false);

  // ── Toast ──
  const [toastVisible, setToastVisible] = useState(false);

  // ─── Load from Database & localStorage ───────────────────────────────────────

  useEffect(() => {
    // 1. Initial load from localStorage (instant cache)
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
    const sn = localStorage.getItem('noka_email_sender_name');
    if (sn !== null) setEmailSenderName(sn);
    const sa = localStorage.getItem('noka_email_sender_address');
    if (sa !== null) setEmailSenderAddress(sa);
    const et = localStorage.getItem('noka_email_transport') as EmailTransport | null;
    if (et !== null) setEmailTransport(et);
    const nnd = localStorage.getItem('noka_notify_node_down');
    if (nnd !== null) setNotifyNodeDown(nnd === 'true');
    const nad = localStorage.getItem('noka_notify_api_down');
    if (nad !== null) setNotifyApiDown(nad === 'true');

    const rawIntegrations = localStorage.getItem('noka_integrations_config');
    if (rawIntegrations) {
      try {
        const parsed = JSON.parse(rawIntegrations);
        setIntegrations(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }

    const perms = localStorage.getItem('noka_permissions');
    if (perms !== null) {
      try {
        setPermissions(JSON.parse(perms));
      } catch {}
    }

    // 2. Fetch authoritative configuration from backend PostgreSQL database
    axios.get('/api/settings')
      .then(res => {
        const dbData = res.data?.data;
        if (dbData) {
          if (dbData.refresh_interval !== undefined) {
            setRefreshInterval(String(dbData.refresh_interval));
            localStorage.setItem('noka_refresh_interval', String(dbData.refresh_interval));
          }
          if (dbData.base_url !== undefined) {
            setBaseUrl(String(dbData.base_url));
            localStorage.setItem('noka_base_url', String(dbData.base_url));
          }
          if (dbData.proxy_url !== undefined) {
            setProxyUrl(String(dbData.proxy_url));
            localStorage.setItem('noka_proxy_url', String(dbData.proxy_url));
          }
          if (dbData.allow_signup !== undefined) {
            setAllowSignup(Boolean(dbData.allow_signup));
            localStorage.setItem('noka_allow_signup', String(dbData.allow_signup));
          }
          if (dbData.send_activation_email !== undefined) {
            setSendActivationEmail(Boolean(dbData.send_activation_email));
            localStorage.setItem('noka_send_activation_email', String(dbData.send_activation_email));
          }
          if (dbData.email_sender_name !== undefined) {
            setEmailSenderName(String(dbData.email_sender_name));
            localStorage.setItem('noka_email_sender_name', String(dbData.email_sender_name));
          }
          if (dbData.email_sender_address !== undefined) {
            setEmailSenderAddress(String(dbData.email_sender_address));
            localStorage.setItem('noka_email_sender_address', String(dbData.email_sender_address));
          }
          if (dbData.email_transport !== undefined) {
            setEmailTransport(dbData.email_transport as EmailTransport);
            localStorage.setItem('noka_email_transport', dbData.email_transport);
          }
          if (dbData.notify_node_down !== undefined) {
            setNotifyNodeDown(Boolean(dbData.notify_node_down));
            localStorage.setItem('noka_notify_node_down', String(dbData.notify_node_down));
          }
          if (dbData.notify_api_down !== undefined) {
            setNotifyApiDown(Boolean(dbData.notify_api_down));
            localStorage.setItem('noka_notify_api_down', String(dbData.notify_api_down));
          }
          if (dbData.integrations_config) {
            setIntegrations(prev => ({ ...prev, ...dbData.integrations_config }));
            localStorage.setItem('noka_integrations_config', JSON.stringify(dbData.integrations_config));
          }
          if (dbData.permissions) {
            setPermissions(dbData.permissions);
            localStorage.setItem('noka_permissions', JSON.stringify(dbData.permissions));
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch settings from DB:', err);
      });
  }, []);

  // ─── Save to Database & localStorage ─────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Save to localStorage for instant local access
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
    localStorage.setItem('noka_integrations_config', JSON.stringify(integrations));
    localStorage.setItem('noka_permissions', JSON.stringify(permissions));

    // Persist to PostgreSQL database
    try {
      await axios.post('/api/settings', {
        settings: {
          refresh_interval: refreshInterval,
          base_url: baseUrl,
          proxy_url: proxyUrl,
          allow_signup: allowSignup,
          send_activation_email: sendActivationEmail,
          email_sender_name: emailSenderName,
          email_sender_address: emailSenderAddress,
          email_transport: emailTransport,
          notify_node_down: notifyNodeDown,
          notify_api_down: notifyApiDown,
          integrations_config: integrations,
          permissions: permissions
        }
      });
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    } catch (err) {
      console.error('Failed to persist settings to DB:', err);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    }
  }, [
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
    integrations,
    permissions,
  ]);

  // ─── Test Send Notification Simulator ─────────────────────────────────────────

  const handleTestChannel = async (channel: IntegrationChannel) => {
    setTestingChannel(true);
    try {
      const chConfig = integrations[channel];
      if (!chConfig.enabled) {
        addToast('error', `Please enable ${channel.toUpperCase()} first before testing.`, 'Channel Disabled');
        setTestingChannel(false);
        return;
      }

      // Quick client-side validation
      if (channel === 'telegram' && (!integrations.telegram.botToken || !integrations.telegram.chatId)) {
        addToast('error', 'Bot Token and Chat ID are required for Telegram.', 'Missing Parameters');
        setTestingChannel(false);
        return;
      }
      if (channel === 'whatsapp' && (!integrations.whatsapp.serverUrl || !integrations.whatsapp.recipient)) {
        addToast('error', 'Server URL and Recipient are required for WhatsApp.', 'Missing Parameters');
        setTestingChannel(false);
        return;
      }
      if (channel === 'webhook' && !integrations.webhook.url) {
        addToast('error', 'Webhook URL is required.', 'Missing Parameters');
        setTestingChannel(false);
        return;
      }
      if (channel === 'slack' && !integrations.slack.webhookUrl) {
        addToast('error', 'Slack Webhook URL is required.', 'Missing Parameters');
        setTestingChannel(false);
        return;
      }
      if (channel === 'discord' && !integrations.discord.webhookUrl) {
        addToast('error', 'Discord Webhook URL is required.', 'Missing Parameters');
        setTestingChannel(false);
        return;
      }

      const res = await axios.post('/api/settings/test-integration', {
        channel,
        config: integrations[channel],
        message: `🔔 [NOKA Gateway Alert] Real-time test notification for ${channel.toUpperCase()}`
      });

      addToast('success', res.data?.message || 'Test notification delivered successfully!', 'Test Sent');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to dispatch test notification.';
      addToast('error', errMsg, 'Dispatch Failed');
    } finally {
      setTestingChannel(false);
    }
  };

  // ─── Permission helpers ──────────────────────────────────────────────────────

  const togglePerm = (resource: ResourceKey, action: keyof ResourcePermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: !prev[resource][action],
      },
    }));
  };

  const permColors: Record<keyof ResourcePermissions, string> = {
    create: 'bg-emerald-500',
    read: 'bg-blue-500',
    update: 'bg-amber-500',
    delete: 'bg-red-500',
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toastVisible && (
        <Toast message="Settings saved successfully!" onClose={() => setToastVisible(false)} />
      )}

      {/* ── Page Header ── */}
      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-primary" />
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Settings</h1>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Configure application preferences, signup restrictions, notifications and user
            permissions.
          </p>
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
      <SectionCard icon={<Bell className="w-4 h-4" />} title="Notifications & Alert Channels">
        {/* Tab bar */}
        <div className="flex gap-0 border border-border-light rounded-lg overflow-hidden w-fit mb-6">
          <button
            type="button"
            onClick={() => setNotifTab('email')}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
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
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border-l border-border-light transition-colors cursor-pointer ${
              notifTab === '3rd'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary'
            }`}
          >
            3rd-Party Integrations Hub
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
          /* 3rd-Party Integrations Hub */
          <div className="space-y-6 animate-fadeIn">
            <div>
              <p className="text-xs font-bold text-text-primary mb-1">Select Integration Channel</p>
              <p className="text-[11px] text-text-muted mb-4">
                Configure instant incident and threat alerts for your DevOps chat rooms and webhook listeners.
              </p>

              {/* Channel Selector Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Telegram */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('telegram')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    selectedChannel === 'telegram'
                      ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300'
                  }`}
                >
                  <Send className="w-5 h-5 text-sky-500" />
                  <div className="text-center">
                    <span className="text-xs block">Telegram</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      integrations.telegram.enabled ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {integrations.telegram.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('whatsapp')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    selectedChannel === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  <div className="text-center">
                    <span className="text-xs block">WhatsApp</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      integrations.whatsapp.enabled ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {integrations.whatsapp.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                </button>

                {/* Webhook */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('webhook')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    selectedChannel === 'webhook'
                      ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300'
                  }`}
                >
                  <Globe className="w-5 h-5 text-brand-primary" />
                  <div className="text-center">
                    <span className="text-xs block">Webhook</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      integrations.webhook.enabled ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {integrations.webhook.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                </button>

                {/* Slack */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('slack')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    selectedChannel === 'slack'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300'
                  }`}
                >
                  <Hash className="w-5 h-5 text-purple-500" />
                  <div className="text-center">
                    <span className="text-xs block">Slack</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      integrations.slack.enabled ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {integrations.slack.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                </button>

                {/* Discord */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('discord')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    selectedChannel === 'discord'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                      : 'border-border-light bg-white text-text-secondary hover:border-slate-300'
                  }`}
                >
                  <Share2 className="w-5 h-5 text-indigo-500" />
                  <div className="text-center">
                    <span className="text-xs block">Discord</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      integrations.discord.enabled ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {integrations.discord.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Channel Form Details */}
            <div className="p-5 rounded-xl border border-border-light bg-slate-50/50 space-y-4">
              {/* Telegram Form */}
              {selectedChannel === 'telegram' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-border-light pb-3">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-sky-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Telegram Bot Configuration
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <span>Enable Telegram Alerts</span>
                      <input
                        type="checkbox"
                        checked={integrations.telegram.enabled}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">
                          Bot Token <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowTelegramToken(!showTelegramToken)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-primary-dark transition-colors cursor-pointer"
                        >
                          {showTelegramToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showTelegramToken ? 'Hide Token' : 'Show Token'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showTelegramToken ? 'text' : 'password'}
                          value={integrations.telegram.botToken}
                          onChange={(e) => setIntegrations(prev => ({
                            ...prev,
                            telegram: { ...prev.telegram, botToken: e.target.value }
                          }))}
                          placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                          className="w-full px-3 py-2 pr-10 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTelegramToken(!showTelegramToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                          title={showTelegramToken ? 'Hide token' : 'Show token'}
                        >
                          {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-text-muted">Obtained from @BotFather on Telegram.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Chat ID / Group ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={integrations.telegram.chatId}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, chatId: e.target.value }
                        }))}
                        placeholder="e.g. -100123456789 or 987654321"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                      <p className="text-[10px] text-text-muted">Target User ID, Group ID, or Channel (@channel_name).</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Topic Thread ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={integrations.telegram.threadId || ''}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, threadId: e.target.value }
                        }))}
                        placeholder="e.g. 12"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                      <p className="text-[10px] text-text-muted">Only required if sending to a specific Supergroup Forum Topic.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Form */}
              {selectedChannel === 'whatsapp' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-border-light pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        WhatsApp Gateway (WAHA / Custom API) Configuration
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <span>Enable WhatsApp Alerts</span>
                      <input
                        type="checkbox"
                        checked={integrations.whatsapp.enabled}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Server API Endpoint URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={integrations.whatsapp.serverUrl}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, serverUrl: e.target.value }
                        }))}
                        placeholder="e.g. http://waha.internal:3000/api/sendText or https://wa.api.gateway/v1/send"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                      <p className="text-[10px] text-text-muted">WAHA HTTP API endpoint or compatible WhatsApp gateway url.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Recipient Number / Group JID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={integrations.whatsapp.recipient}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, recipient: e.target.value }
                        }))}
                        placeholder="e.g. 6281234567890@c.us or 12036302@g.us"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                      <p className="text-[10px] text-text-muted">International phone number with country code or Group JID.</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">
                          Session / API Key (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowWhatsAppSession(!showWhatsAppSession)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-primary-dark transition-colors cursor-pointer"
                        >
                          {showWhatsAppSession ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showWhatsAppSession ? 'Hide Key' : 'Show Key'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showWhatsAppSession ? 'text' : 'password'}
                          value={integrations.whatsapp.session || ''}
                          onChange={(e) => setIntegrations(prev => ({
                            ...prev,
                            whatsapp: { ...prev.whatsapp, session: e.target.value }
                          }))}
                          placeholder="e.g. default"
                          className="w-full px-3 py-2 pr-10 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWhatsAppSession(!showWhatsAppSession)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                          title={showWhatsAppSession ? 'Hide key' : 'Show key'}
                        >
                          {showWhatsAppSession ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-text-muted">Session identifier or authorization header token.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Webhook Form */}
              {selectedChannel === 'webhook' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-border-light pb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-brand-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Generic HTTP Webhook Configuration
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <span>Enable Webhook Alerts</span>
                      <input
                        type="checkbox"
                        checked={integrations.webhook.enabled}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Webhook Target URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={integrations.webhook.url}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, url: e.target.value }
                        }))}
                        placeholder="e.g. https://api.ops.company.com/v1/alerts"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        HTTP Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={integrations.webhook.method}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, method: e.target.value as 'POST' | 'PUT' }
                        }))}
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-bold text-text-primary focus:outline-none focus:border-brand-primary"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-3">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        API Key (Optional)
                      </label>
                      <AntiInspectSecretInput
                        value={integrations.webhook.apiKey || ''}
                        onChange={(val) => setIntegrations(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, apiKey: val }
                        }))}
                        placeholder="e.g. your-api-key"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">
                          Additional Custom Headers (JSON format)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowWebhookHeaders(!showWebhookHeaders)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-primary-dark transition-colors cursor-pointer"
                        >
                          {showWebhookHeaders ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showWebhookHeaders ? 'Mask Secret Headers' : 'Show Secret Text'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={integrations.webhook.headersJson || ''}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, headersJson: e.target.value }
                        }))}
                        placeholder='{"Authorization": "Bearer secret_token", "X-Custom-Header": "value"}'
                        style={showWebhookHeaders ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                      <p className="text-[10px] text-text-muted">JSON object containing headers to include in the HTTP request.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slack Form */}
              {selectedChannel === 'slack' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-border-light pb-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-purple-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Slack Incoming Webhook Configuration
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <span>Enable Slack Alerts</span>
                      <input
                        type="checkbox"
                        checked={integrations.slack.enabled}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          slack: { ...prev.slack, enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">
                          Incoming Webhook URL <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSlackUrl(!showSlackUrl)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-primary-dark transition-colors cursor-pointer"
                        >
                          {showSlackUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showSlackUrl ? 'Hide URL' : 'Show URL'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showSlackUrl ? 'text' : 'password'}
                          value={integrations.slack.webhookUrl}
                          onChange={(e) => setIntegrations(prev => ({
                            ...prev,
                            slack: { ...prev.slack, webhookUrl: e.target.value }
                          }))}
                          placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                          className="w-full px-3 py-2 pr-10 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSlackUrl(!showSlackUrl)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                          title={showSlackUrl ? 'Hide URL' : 'Show URL'}
                        >
                          {showSlackUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-text-muted">Create an Incoming Webhook in your Slack Workspace App configuration.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Override Channel (Optional)
                      </label>
                      <input
                        type="text"
                        value={integrations.slack.channel || ''}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          slack: { ...prev.slack, channel: e.target.value }
                        }))}
                        placeholder="#gateway-alerts"
                        className="w-full px-3 py-2 border border-border-light bg-white rounded text-xs font-medium focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Discord Form */}
              {selectedChannel === 'discord' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-border-light pb-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Discord Channel Webhook Configuration
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <span>Enable Discord Alerts</span>
                      <input
                        type="checkbox"
                        checked={integrations.discord.enabled}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          discord: { ...prev.discord, enabled: e.target.checked }
                        }))}
                        className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">
                        Discord Webhook URL <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDiscordUrl(!showDiscordUrl)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:text-brand-primary-dark transition-colors cursor-pointer"
                      >
                        {showDiscordUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showDiscordUrl ? 'Hide URL' : 'Show URL'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showDiscordUrl ? 'text' : 'password'}
                        value={integrations.discord.webhookUrl}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          discord: { ...prev.discord, webhookUrl: e.target.value }
                        }))}
                        placeholder="https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz"
                        className="w-full px-3 py-2 pr-10 border border-border-light bg-white rounded text-xs font-mono font-medium focus:outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDiscordUrl(!showDiscordUrl)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                        title={showDiscordUrl ? 'Hide URL' : 'Show URL'}
                      >
                        {showDiscordUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-text-muted">Generated under Discord Server Settings → Integrations → Webhooks.</p>
                  </div>
                </div>
              )}

              {/* Action Bar for Channel */}
              <div className="flex items-center justify-end pt-3 border-t border-border-light/80 gap-3">
                <button
                  type="button"
                  onClick={() => handleTestChannel(selectedChannel)}
                  disabled={testingChannel}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingChannel ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Test {selectedChannel.toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-brand-primary text-white text-sm font-bold rounded-lg hover:bg-brand-primary/90 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
      >
        <Save className="w-4 h-4" />
        Save Settings
      </button>
    </div>
  );
};
