import React, { useState } from 'react';
import {
  HelpCircle,
  ExternalLink,
  Activity,
  LayoutDashboard,
  Server,
  Users,
  Plug,
  Shield,
  Settings,
  Info,
  Camera,
  BookOpen,
  ChevronRight,
  Bell,
  Globe,
  Lock,
  Key,
  Database,
  Route,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'OVERVIEW' | 'DASHBOARD' | 'API_GATEWAY' | 'APPLICATION' | 'SETTINGS';

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-3 text-brand-primary">
    {icon}
    <h4 className="text-sm font-bold text-text-primary">{title}</h4>
  </div>
);

const FeatureRow: React.FC<{ label: string; description: string }> = ({ label, description }) => (
  <div className="flex gap-3 py-3 border-b border-border-light last:border-0">
    <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-brand-primary shrink-0" />
    <div>
      <p className="text-xs font-bold text-text-primary">{label}</p>
      <p className="text-xs text-text-secondary leading-relaxed mt-0.5">{description}</p>
    </div>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white p-6 rounded-lg border border-border-light shadow-sm ${className}`}>
    {children}
  </div>
);

const InfoBadge: React.FC<{ text: string }> = ({ text }) => (
  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
    {text}
  </span>
);

// ─── Tab Content ─────────────────────────────────────────────────────────────

const OverviewTab: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <SectionHeader icon={<BookOpen className="w-4 h-4" />} title="What is NOKA?" />
      <p className="text-xs text-text-secondary leading-relaxed">
        NOKA (Nocta Kong Admin) is a premium open-source administrative console for Kong API Gateway.
        It provides a full GUI to manage your Services, Routes, Consumers, Plugins, Certificates,
        Upstreams, Vaults, Keys, and Key Sets — complete with user role configurations, audit logs,
        and connection management across multiple Kong nodes.
      </p>
    </Card>

    <Card>
      <SectionHeader icon={<LayoutDashboard className="w-4 h-4" />} title="Sidebar Navigation Structure" />
      <p className="text-xs text-text-secondary mb-4">
        The left sidebar organises all features into logical groups. Here is a reference for every navigation item:
      </p>
      <div className="space-y-0">
        <FeatureRow label="Dashboard" description="High-level metrics, gateway status, Prometheus analytics, and Nginx connection activity charts." />
        <FeatureRow label="API Gateway" description="The core Kong resource management section: Info, Services, Routes, Consumers, Plugins, Upstreams, Certificates, Vaults, Keys, Key Sets, and Snapshots." />
        <FeatureRow label="Application" description="NOKA-specific administration: Users, Connections (Kong Admin API endpoints), and Audit Logs." />
        <FeatureRow label="Settings" description="Application-level configuration: auto-refresh, sign-up restrictions, email notifications, and user permissions." />
        <FeatureRow label="Help" description="This page — contextual documentation for every feature in NOKA." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Server className="w-4 h-4" />} title="Core Kong Concepts" />
      <p className="text-xs text-text-secondary mb-4">
        Understanding these primitives will help you navigate NOKA effectively:
      </p>
      <div className="space-y-0">
        <FeatureRow label="Services" description="Represent upstream backend APIs. A Service holds the host, port, protocol, and path of a real backend." />
        <FeatureRow label="Routes" description="Define the rules (paths, hosts, methods, headers) that tell Kong which Service to forward a request to." />
        <FeatureRow label="Consumers" description="Represent the users or applications that consume your APIs. Credentials (JWT, API keys, OAuth) are attached to consumers." />
        <FeatureRow label="Plugins" description="Extend Kong's functionality — rate limiting, authentication, logging, transformations, etc. Plugins can be scoped globally, per-Service, per-Route, or per-Consumer." />
        <FeatureRow label="Upstreams" description="Virtual hostnames that provide load balancing across a pool of backend Targets. Health checks and ring-balancer settings live here." />
        <FeatureRow label="Certificates" description="SSL/TLS certificates and keys managed by Kong for HTTPS termination. Linked to SNI records." />
        <FeatureRow label="Vaults" description="Secret backends (e.g., HashiCorp Vault, AWS Secrets Manager) that allow Kong to pull sensitive config values at runtime." />
      </div>
    </Card>
  </div>
);

const DashboardTab: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <SectionHeader icon={<LayoutDashboard className="w-4 h-4" />} title="Status Cards" />
      <p className="text-xs text-text-secondary mb-4">
        The top row of the Dashboard shows four real-time status indicators:
      </p>
      <div className="space-y-0">
        <FeatureRow
          label="Nginx Connection Status"
          description="Shows whether the Kong node's underlying Nginx proxy is reachable. A green 'Alive' badge confirms healthy connectivity; red 'Unreachable' means NOKA cannot contact the node."
        />
        <FeatureRow
          label="Stats Grid — Services / Routes / Consumers / Plugins"
          description="Live counts pulled from the Kong Admin API for each core resource type. These refresh at the interval configured in Settings → Dashboard Refresh Interval."
        />
        <FeatureRow
          label="Active Gateway Node"
          description="Displays the hostname and Admin API URL of the currently selected Kong connection. Switch connections in Application → Connections."
        />
        <FeatureRow
          label="Gateway Status"
          description="Reports whether the Kong Admin API itself is responding. Distinct from Nginx status — Kong can be up while Nginx is being reconfigured, or vice versa."
        />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Activity className="w-4 h-4" />} title="Gateway Performance & Analytics" />
      <div className="flex items-start gap-2 mb-3 p-3 rounded bg-amber-50 border border-amber-100">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          This section shows live <strong>Prometheus metrics</strong> from Kong. To activate it, enable the{' '}
          <strong>Prometheus plugin</strong> globally on your Kong node. Without the plugin, these charts will show no data.
        </p>
      </div>
      <div className="space-y-0">
        <FeatureRow label="Requests per second" description="Aggregated throughput across all proxied routes, sampled from Kong's Prometheus /metrics endpoint." />
        <FeatureRow label="Latency percentiles (p50 / p95 / p99)" description="Response time distribution for proxied requests, helping identify performance regressions." />
        <FeatureRow label="Error rate" description="Percentage of 4xx/5xx responses relative to total requests over the selected window." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Activity className="w-4 h-4" />} title="Server Activity Chart" />
      <p className="text-xs text-text-secondary leading-relaxed">
        Shows real-time <strong>Nginx connection counts</strong> polled from Kong's status API. Each metric
        represents a distinct phase of the HTTP connection lifecycle:
      </p>
      <div className="mt-3 space-y-0">
        <FeatureRow label="Active" description="Total number of open connections, including all connections in reading, writing, and waiting states." />
        <FeatureRow label="Reading" description="Connections where Nginx is currently reading the incoming request headers from the client." />
        <FeatureRow label="Writing" description="Connections where Nginx is sending a response back to the client." />
        <FeatureRow label="Waiting" description="Idle keep-alive connections — clients that have completed a request but are holding the connection open for future requests." />
      </div>
    </Card>
  </div>
);

const ApiGatewayTab: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <SectionHeader icon={<Info className="w-4 h-4" />} title="Info" />
      <p className="text-xs text-text-secondary leading-relaxed">
        Displays detailed technical information about the active Kong Gateway node, including: Kong version,
        hostname, Lua VM version, timer stats (pending/running), datastore connection details, and a
        searchable list of all available plugins installed on the node. The <strong>Raw Configuration Details</strong>{' '}
        section shows the full node configuration JSON — useful for debugging and auditing.
      </p>
    </Card>

    <Card>
      <SectionHeader icon={<Server className="w-4 h-4" />} title="Services" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Manage Kong upstream services. Each service defines a backend by specifying its host, port, protocol,
        and path. Services are the target of one or more Routes.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Search" description="Filter the services list by name in real time using the search box." />
        <FeatureRow label="Tags" description="Filter services by their Kong tags — useful in large deployments to group related services (e.g., 'prod', 'v2')." />
        <FeatureRow label="Create / Edit" description="Add a new service or update an existing one. You can specify protocol, host, port, path, connect/read/write timeouts, and retries." />
        <FeatureRow label="Service Detail" description="Click a service row to view its full configuration, attached Routes, and active Plugins." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Route className="w-4 h-4" />} title="Routes" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Define routing rules that map incoming HTTP requests to Services. Kong evaluates routes by matching
        paths, hosts, methods, and headers against the incoming request.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Paths" description="URL path prefixes or regex patterns this route matches (e.g., /api/v1)." />
        <FeatureRow label="Hosts" description="Domain names this route matches. Useful for virtual host-based routing." />
        <FeatureRow label="Methods" description="HTTP methods (GET, POST, PUT, DELETE, etc.) to match. Leave empty to match all methods." />
        <FeatureRow label="Tags" description="Filter and organise routes using Kong tag labels." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Users className="w-4 h-4" />} title="Consumers" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Manage API consumers — the users or applications that access your APIs. Consumers are identified by a
        username and/or custom ID. Credentials are attached per consumer.
      </p>
      <div className="space-y-0">
        <FeatureRow label="JWT credentials" description="Generate JWT secrets for consumers using the JWT plugin." />
        <FeatureRow label="API Keys" description="Issue API keys via the key-auth plugin scoped to a specific consumer." />
        <FeatureRow label="OAuth 2.0" description="Manage OAuth tokens when the OAuth2 plugin is enabled." />
        <FeatureRow label="Basic Auth" description="Assign username/password basic authentication credentials." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Plug className="w-4 h-4" />} title="Plugins" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Enable and configure Kong plugins to add cross-cutting concerns to your gateway — authentication,
        rate limiting, logging, caching, transformations, and more.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Global scope" description="Plugins applied globally run on every request across all Services and Routes." />
        <FeatureRow label="Service / Route / Consumer scope" description="Narrow a plugin's effect to a specific resource by scoping it from the detail page of that resource." />
        <FeatureRow label="Tag filtering" description="Group related plugins with tags and filter the list by tag to manage large plugin sets efficiently." />
        <FeatureRow label="Enable / Disable" description="Toggle a plugin's active state without deleting its configuration." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Database className="w-4 h-4" />} title="Upstreams" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Configure load balancing across multiple backend targets. An Upstream acts as a virtual hostname;
        a Service points to it, and Kong distributes requests across the Upstream's Targets.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Targets" description="Individual backend addresses (host:port) with optional weights for weighted round-robin distribution." />
        <FeatureRow label="Health checks" description="Active and passive health checks detect when a target goes down and automatically remove it from rotation." />
        <FeatureRow label="Ring-balancer settings" description="Configure the balancing algorithm (round-robin, consistent-hashing, least-connections) and slot count." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Shield className="w-4 h-4" />} title="Certificates" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Manage SSL/TLS certificates for your Kong node. Kong uses certificates for HTTPS termination at the
        proxy layer. Each certificate is paired with an SNI record that maps a hostname to the certificate.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Certificate body" description="Paste your PEM-encoded public certificate (and optional chain) into the cert field." />
        <FeatureRow label="Private key" description="Paste your PEM-encoded private key into the key field. Keys are stored securely in Kong's datastore." />
        <FeatureRow label="SNI records" description="Map domain names (e.g., api.example.com) to a certificate. Kong selects the correct cert via TLS SNI negotiation." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Key className="w-4 h-4" />} title="Vaults, Keys & Key Sets" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Manage cryptographic material and secret backends. These features require Kong Enterprise or a
        configured vault plugin on your Kong node.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Vaults" description="Define secret backends (e.g., HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager). Kong pulls sensitive values from vaults at runtime instead of storing them in the database." />
        <FeatureRow label="Keys" description="Store raw asymmetric or symmetric cryptographic keys (JWK format) for use by plugins such as JWT Signer." />
        <FeatureRow label="Key Sets" description="Group related keys into named sets so plugins can reference the entire set for key rotation scenarios." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Camera className="w-4 h-4" />} title="Snapshots" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Create a full backup of your Kong configuration and restore it at any time.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Create snapshot" description="Exports all Services, Routes, Consumers, Upstreams, and Plugins from the active Kong node as a downloadable JSON file. Use this before major changes or upgrades." />
        <FeatureRow label="Restore snapshot" description="Upload a previously downloaded snapshot JSON file to re-apply its configuration to the active Kong node. Existing conflicting entities will be updated." />
        <FeatureRow label="History" description="NOKA keeps a list of snapshot files you have created in the current session for quick re-download." />
      </div>
    </Card>
  </div>
);

const ApplicationTab: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <SectionHeader icon={<Users className="w-4 h-4" />} title="Users" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Manage NOKA admin accounts. Users with the <strong>admin</strong> role can create, update, and
        deactivate other user accounts.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Create user" description="Register a new NOKA user manually. Bypasses the public registration flow — useful when self-registration is disabled." />
        <FeatureRow label="Deactivate / Reactivate" description="Disable a user's access without permanently deleting their account and audit history." />
        <FeatureRow label="Role assignment" description="Assign roles (admin, user) that determine which operations the user can perform, subject to the permissions defined in Settings." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Globe className="w-4 h-4" />} title="Connections" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        Define and manage Kong Admin API connections. A connection stores the Admin API URL and credentials
        for a Kong node. Only one connection can be <strong>active</strong> at a time for the current session.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Add connection" description="Enter the Kong Admin API base URL (e.g., http://localhost:8001). Optionally add an API key if Kong Admin API authentication is enabled." />
        <FeatureRow label="Set active" description="Click 'Activate' on a connection to make it the target for all API operations in the current session. The active connection is shown in the Dashboard status card." />
        <FeatureRow label="Health check" description="NOKA pings each connection's Admin API to display a live reachability status badge." />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<BookOpen className="w-4 h-4" />} title="Audit Logs" />
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        View a chronological log of all administrative actions performed through NOKA. Each log entry records
        who performed the action, what resource was affected, and when it occurred.
      </p>
      <div className="space-y-0">
        <FeatureRow label="Action types" description="CREATE, UPDATE, DELETE, LOGIN, LOGOUT and other lifecycle events are all tracked." />
        <FeatureRow label="Filtering" description="Filter the log by user, date range, or action type to narrow down specific changes." />
        <FeatureRow label="Retention" description="Audit logs are stored in the NOKA database and are not affected by Kong restarts or snapshots." />
      </div>
    </Card>
  </div>
);

const SettingsTab: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <SectionHeader icon={<Settings className="w-4 h-4" />} title="General Settings" />
      <div className="space-y-0">
        <FeatureRow
          label="Dashboard Refresh Interval (ms)"
          description="The interval at which the Dashboard page automatically polls the Kong Admin API and Nginx status endpoint for new data. Set to 0 to disable auto-refresh entirely. Default: 30000 (30 seconds). After saving, refresh the Dashboard page for the new interval to take effect."
        />
        <FeatureRow
          label="Base URL"
          description="The public URL of this NOKA instance (e.g., https://noka.example.com). Used to generate absolute links in notification emails and activation links. If left blank, NOKA falls back to using the server's IP address and port."
        />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Lock className="w-4 h-4" />} title="Sign Up Restrictions" />
      <div className="space-y-0">
        <FeatureRow
          label="Allow users to sign up"
          description="When enabled, the Login page displays a 'Register' link and new users can self-register for a NOKA account. Disable this toggle to lock down the instance so that only admins can create new accounts via the Users page."
        />
        <FeatureRow
          label="Send activation email"
          description="When enabled, newly registered users receive an email containing an activation link. Their account remains inactive until they click the link. When disabled, accounts are activated automatically upon registration. Requires email notifications to be configured."
        />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Bell className="w-4 h-4" />} title="Notifications" />
      <div className="space-y-0">
        <FeatureRow
          label="Default sender name"
          description="The display name used in the 'From' field of all outgoing NOKA emails (e.g., 'NOKA Admin')."
        />
        <FeatureRow
          label="Default sender address"
          description="The 'From' email address for all outgoing NOKA emails (e.g., noreply@example.com). Ensure this address is authorised by your mail provider to avoid messages landing in spam."
        />
        <FeatureRow
          label="Transport — SMTP"
          description="Send emails via a standard SMTP server. Configure the host, port, username, password, and whether to use TLS/STARTTLS. Suitable for most self-hosted mail servers and cloud SMTP providers (SendGrid, Amazon SES, etc.)."
        />
        <FeatureRow
          label="Transport — Sendmail"
          description="Delegate email delivery to the system's local sendmail command. Zero-configuration option when the host OS already has a mail transfer agent configured."
        />
        <FeatureRow
          label="Transport — Mailgun"
          description="Send emails via the Mailgun HTTP API. Provide your Mailgun API key and domain. Requires an active Mailgun account."
        />
        <FeatureRow
          label="Notify when node is down"
          description="When enabled, NOKA will send an alert email to all admin users whenever a monitored Kong node becomes unresponsive. Requires at least one email transport to be configured and health checks to be active."
        />
        <FeatureRow
          label="Notify when API is down"
          description="When enabled, NOKA will send an alert email to all admin users when an API endpoint (Service or Route) fails its health check. Useful for immediate incident awareness without a separate monitoring tool."
        />
      </div>
    </Card>

    <Card>
      <SectionHeader icon={<Shield className="w-4 h-4" />} title="User Permissions" />
      <p className="text-xs text-text-secondary leading-relaxed mb-4">
        Define what CRUD operations (Create, Read, Update, Delete) non-admin users can perform on each
        Kong resource type. These rules are enforced when Role-Based Access Control (RBAC) is active in NOKA.
      </p>
      <div className="space-y-0">
        <FeatureRow
          label="Resource-level permissions"
          description="Each Kong resource (Services, Routes, Consumers, Plugins, Upstreams, Certificates, etc.) has independent read/create/update/delete toggles. The default grants all users read access to every resource."
        />
        <FeatureRow
          label="Admin override"
          description="Users with the 'admin' role bypass all permission checks and always have full access to every resource."
        />
        <FeatureRow
          label="Effect on UI"
          description="When a user lacks a specific permission, the corresponding action buttons (Create, Edit, Delete) are hidden or disabled on the relevant page — the API call is also blocked server-side."
        />
      </div>
    </Card>
  </div>
);

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'OVERVIEW',     label: 'Overview',     icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'DASHBOARD',    label: 'Dashboard',    icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'API_GATEWAY',  label: 'API Gateway',  icon: <Server className="w-3.5 h-3.5" /> },
  { id: 'APPLICATION',  label: 'Application',  icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'SETTINGS',     label: 'Settings',     icon: <Settings className="w-3.5 h-3.5" /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export const Help: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');

  return (
    <div className="space-y-6 font-sans">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="p-8 rounded-lg bg-white border border-border-light shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-brand-primary/10 text-brand-primary">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Help &amp; Documentation</h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              Get support and learn more about managing your Kong API Gateways with NOKA.
              Use the tabs below to explore documentation for each section of the application.
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Reference Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What is NOKA? */}
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-brand-primary/10 text-brand-primary">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">What is NOKA?</h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            NOKA (Nocta Kong Admin) is a premium open-source administrative console designed to manage Kong
            API Gateways. It provides full GUI control over your Services, Routes, Consumers, Plugins,
            Certificates, and Upstreams, complete with user role configurations and comprehensive audit logs.
          </p>
        </div>

        {/* Documentation Links */}
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-emerald-50 text-emerald-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">Documentation Links</h3>
          </div>
          <div className="space-y-2">
            <a
              href="https://docs.konghq.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold text-text-secondary transition-colors"
            >
              Kong Gateway Official Docs
              <ExternalLink className="w-4 h-4 text-text-muted" />
            </a>
            <a
              href="https://docs.konghq.com/gateway/latest/admin-api/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold text-text-secondary transition-colors"
            >
              Kong Admin API Reference
              <ExternalLink className="w-4 h-4 text-text-muted" />
            </a>
            <a
              href="https://github.com/pantsel/konga"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold text-text-secondary transition-colors"
            >
              Legacy Konga GitHub Repository
              <ExternalLink className="w-4 h-4 text-text-muted" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Feature Guide ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border-light overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-slate-50',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {TABS.find((t) => t.id === activeTab)?.label} Guide
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                Detailed documentation for the{' '}
                <span className="font-semibold">{TABS.find((t) => t.id === activeTab)?.label}</span> section
              </p>
            </div>
            <InfoBadge text="Reference" />
          </div>

          {activeTab === 'OVERVIEW'    && <OverviewTab />}
          {activeTab === 'DASHBOARD'   && <DashboardTab />}
          {activeTab === 'API_GATEWAY' && <ApiGatewayTab />}
          {activeTab === 'APPLICATION' && <ApplicationTab />}
          {activeTab === 'SETTINGS'    && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};
