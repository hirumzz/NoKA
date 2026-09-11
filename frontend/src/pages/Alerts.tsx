import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  BellRing,
  ShieldAlert,
  Radio,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Play,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Send,
  Sparkles,
  Zap,
  Flame,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  Globe,
  Hash,
  Share2,
  MessageSquare,
  AlertTriangle,
  Info,
  ShieldCheck,
  FileCode2,
  Lock,
  Activity,
  History,
  User,
  Sliders,
  Variable,
  BookOpen,
  Eye
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

// ─── Interfaces & Types ────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type EventSourceKey =
  | 'reachability_ping'
  | 'gateway_node'
  | 'plugin_registry'
  | 'metrics'
  | 'audit_mutation'
  | 'ssl_cert'
  | 'custom';

export type ConditionCategory =
  | EventSourceKey
  | 'plugin_security_anomaly'
  | 'ping_5xx_failure'
  | 'gateway_node_down'
  | 'http_5xx_rate'
  | 'high_latency'
  | 'cert_expiring'
  | 'critical_config_mutation';

export type ChannelKey = 'telegram' | 'whatsapp' | 'slack' | 'discord' | 'webhook';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'not_contains'
  | 'in_list'
  | 'regex_match';

export interface AlertConditionItem {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface AlertRuleConfig {
  target_plugins?: string;
  scope?: string;
  threshold_rate?: number;
  threshold_latency_ms?: number;
  threshold_cert_days?: number;
  match_logic?: 'AND' | 'OR';
  conditions?: AlertConditionItem[];
  custom_template?: string;
  webhook_payload_template?: string;
  [key: string]: unknown;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  category: ConditionCategory;
  condition_type?: string;
  custom_template?: string;
  config: AlertRuleConfig;
  channels: ChannelKey[];
  cooldown_mins: number;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  last_triggered_at?: string;
}

export interface ChannelDeliveryStatus {
  channel: ChannelKey;
  status: 'sent' | 'failed' | 'skipped';
  delivered_at: string;
  error?: string;
}

export interface IncidentAuditLog {
  id: string;
  rule_id?: string;
  rule_name: string;
  severity: AlertSeverity;
  category: ConditionCategory;
  message: string;
  timestamp: string;
  channels: ChannelDeliveryStatus[];
  metadata?: Record<string, unknown>;
}

export interface AlertRecipe {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  source: EventSourceKey;
  severity: AlertSeverity;
  matchLogic: 'AND' | 'OR';
  conditions: AlertConditionItem[];
  template: string;
  channels: ChannelKey[];
  description: string;
}

// ─── Constants & Metadata ───────────────────────────────────────────────────────

export const EVENT_SOURCES: Record<
  EventSourceKey,
  { label: string; icon: React.ReactNode; color: string; description: string; fields: string[] }
> = {
  reachability_ping: {
    label: 'Reachability Ping / Health Check',
    icon: <Radio className="w-3.5 h-3.5 text-rose-500" />,
    color: 'border-rose-200 bg-rose-50 text-rose-900',
    description: 'Status codes, URLs, Latency, and Synthetic Probe health monitoring',
    fields: ['status_code', 'target_url', 'latency_ms', 'method']
  },
  gateway_node: {
    label: 'Gateway Node Health',
    icon: <Cpu className="w-3.5 h-3.5 text-red-600" />,
    color: 'border-red-200 bg-red-50 text-red-900',
    description: 'Kong Admin API cluster node health, offline state, and timers',
    fields: ['status', 'node_name', 'node_url', 'status_code', 'cluster_state']
  },
  plugin_registry: {
    label: 'Plugins Scanner',
    icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
    color: 'border-amber-200 bg-amber-50 text-amber-900',
    description: 'Pre-function, security bypasses, and unauthorized custom plugins',
    fields: ['plugin_name', 'scope', 'enabled', 'protocols']
  },
  metrics: {
    label: 'Prometheus Metrics',
    icon: <Activity className="w-3.5 h-3.5 text-orange-500" />,
    color: 'border-orange-200 bg-orange-50 text-orange-900',
    description: 'HTTP 5xx rate spikes, request volume, and latency anomalies',
    fields: ['error_rate', 'latency_ms', 'total_requests', 'status_code']
  },
  audit_mutation: {
    label: 'Audit Log Mutations',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />,
    color: 'border-purple-200 bg-purple-50 text-purple-900',
    description: 'CREATE, UPDATE, DELETE actions executed on entities and Kong configs',
    fields: ['entity', 'action', 'actor', 'path', 'method']
  },
  ssl_cert: {
    label: 'SSL / TLS Certificates',
    icon: <Lock className="w-3.5 h-3.5 text-blue-500" />,
    color: 'border-blue-200 bg-blue-50 text-blue-900',
    description: 'Days before expiration, SANs, and SSL certificate validity',
    fields: ['cert_days_left', 'sni', 'issuer']
  },
  custom: {
    label: 'Custom / Generic Rule',
    icon: <Sliders className="w-3.5 h-3.5 text-indigo-500" />,
    color: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    description: 'Composable criteria evaluating arbitrary payload variables',
    fields: ['custom_key', 'header', 'payload_field', 'status', 'tag']
  }
};

export const ALERT_RECIPES: AlertRecipe[] = [
  {
    id: '5xx_outage',
    name: '5xx Gateway Outage Alert',
    badge: '🔴 5xx Gateway Outage',
    badgeColor: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:border-rose-400',
    source: 'reachability_ping',
    severity: 'critical',
    matchLogic: 'AND',
    conditions: [
      {
        id: 'rec_cond_1',
        field: 'status_code',
        operator: 'in_list',
        value: '500,502,503,504'
      }
    ],
    template: '🚨 [CRITICAL OUTAGE] {{target}} returned HTTP {{status_code}}\nTimestamp: {{timestamp}}\nDetails: {{details}}',
    channels: ['telegram'],
    description: 'Triggers critical alarm when reachability probe returns 500, 502, 503, or 504 status.'
  },
  {
    id: 'prefunction_guard',
    name: 'Pre-function Lua Anomaly Guard',
    badge: '⚡ Pre-function Lua Guard',
    badgeColor: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400',
    source: 'plugin_registry',
    severity: 'critical',
    matchLogic: 'AND',
    conditions: [
      {
        id: 'rec_cond_1',
        field: 'plugin_name',
        operator: 'in_list',
        value: 'pre-function,post-function'
      }
    ],
    template: '⚡ [SECURITY ANOMALY] Sensitive plugin "{{target}}" was activated on gateway!\nActor: {{actor}}\nTime: {{timestamp}}',
    channels: ['telegram'],
    description: 'Monitors plugin activations for high-risk pre-function / post-function Lua script injectors.'
  },
  {
    id: 'node_down',
    name: 'Kong Admin Node Down Alarm',
    badge: '⚠️ Kong Admin Node Down',
    badgeColor: 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100 hover:border-red-400',
    source: 'gateway_node',
    severity: 'critical',
    matchLogic: 'AND',
    conditions: [
      {
        id: 'rec_cond_1',
        field: 'status',
        operator: 'equals',
        value: 'down'
      }
    ],
    template: '⚠️ [GATEWAY NODE DOWN] Node {{target}} is offline or unreachable!\nTime: {{timestamp}}',
    channels: ['telegram'],
    description: 'Alerts when any Kong Admin node becomes unreachable or reports down state.'
  },
  {
    id: 'latency_spike',
    name: 'High Latency Spike Monitor',
    badge: '📈 Latency Spike (>1000ms)',
    badgeColor: 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 hover:border-orange-400',
    source: 'metrics',
    severity: 'warning',
    matchLogic: 'AND',
    conditions: [
      {
        id: 'rec_cond_1',
        field: 'latency_ms',
        operator: 'greater_than',
        value: '1000'
      }
    ],
    template: '⏱ [LATENCY SPIKE] High latency detected on {{target}} ({{status_code}}ms)\nTime: {{timestamp}}',
    channels: ['telegram'],
    description: 'Warns when gateway latency on any upstream target exceeds 1000ms.'
  },
  {
    id: 'ssl_expiry',
    name: 'SSL Certificate Expiration Warning',
    badge: '🔒 SSL Expiry (<30 Days)',
    badgeColor: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400',
    source: 'ssl_cert',
    severity: 'warning',
    matchLogic: 'AND',
    conditions: [
      {
        id: 'rec_cond_1',
        field: 'cert_days_left',
        operator: 'less_equal',
        value: '30'
      }
    ],
    template: '🔒 [SSL EXPIRING] Certificate for {{target}} will expire in {{status_code}} days!\nTime: {{timestamp}}',
    channels: ['telegram'],
    description: 'Proactively warns before SSL certificates expire within 30 days.'
  },
  {
    id: 'audit_deletion',
    name: 'Critical Resource Deletion Guard',
    badge: '🛡️ Critical Resource Deletion',
    badgeColor: 'border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 hover:border-purple-400',
    source: 'audit_mutation',
    severity: 'error',
    matchLogic: 'AND',
    conditions: [
      {
        id: 'rec_cond_1',
        field: 'action',
        operator: 'equals',
        value: 'DELETE'
      },
      {
        id: 'rec_cond_2',
        field: 'entity',
        operator: 'in_list',
        value: 'service,route,plugin'
      }
    ],
    template: '🛡️ [AUDIT DELETION] Critical {{target}} was deleted by {{actor}}!\nTime: {{timestamp}}',
    channels: ['telegram'],
    description: 'Captures mutations deleting essential Services, Routes, or Plugins.'
  }
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string; symbol: string; placeholder: string }[] = [
  { value: 'equals', label: 'Equals (=)', symbol: '=', placeholder: 'e.g. 500 or active' },
  { value: 'not_equals', label: 'Does Not Equal (!=)', symbol: '!=', placeholder: 'e.g. 200' },
  { value: 'greater_than', label: 'Greater Than (>)', symbol: '>', placeholder: 'e.g. 1000' },
  { value: 'less_than', label: 'Less Than (<)', symbol: '<', placeholder: 'e.g. 30' },
  { value: 'greater_equal', label: 'Greater or Equal (>=)', symbol: '>=', placeholder: 'e.g. 5' },
  { value: 'less_equal', label: 'Less or Equal (<=)', symbol: '<=', placeholder: 'e.g. 10' },
  { value: 'contains', label: 'Contains text', symbol: '⊇', placeholder: 'e.g. pre-function' },
  { value: 'not_contains', label: 'Does not contain', symbol: '⊄', placeholder: 'e.g. bearer' },
  { value: 'in_list', label: 'In list (comma separated)', symbol: '∈', placeholder: 'e.g. 500,502,503' },
  { value: 'regex_match', label: 'Regex Match', symbol: '.*', placeholder: 'e.g. ^5[0-9]{2}$' }
];

export const SOURCE_DEFAULTS: Record<
  EventSourceKey,
  {
    conditions: { field: string; operator: ConditionOperator; value: string }[];
    template: string;
    nameSuggestion: string;
    description: string;
  }
> = {
  reachability_ping: {
    conditions: [
      { field: 'status_code', operator: 'in_list', value: '500,502,503,504' }
    ],
    template: '🚨 [CRITICAL OUTAGE] Route {{target}} returned HTTP {{status_code}}\nTimestamp: {{timestamp}}\nDetails: {{details}}',
    nameSuggestion: '5xx Gateway Outage Alert',
    description: 'Triggers critical alarm when reachability probe returns 500, 502, 503, or 504 status.'
  },
  gateway_node: {
    conditions: [
      { field: 'status', operator: 'equals', value: 'down' }
    ],
    template: '⚠️ [GATEWAY NODE DOWN] Node {{target}} is offline or unreachable!\nTimestamp: {{timestamp}}',
    nameSuggestion: 'Kong Admin Node Offline Guard',
    description: 'Alerts when any Kong Admin node becomes unreachable or reports down state.'
  },
  plugin_registry: {
    conditions: [
      { field: 'plugin_name', operator: 'in_list', value: 'pre-function,post-function' }
    ],
    template: '⚡ [SECURITY ANOMALY] Sensitive plugin "{{target}}" was detected active on gateway!\nActor: {{actor}}\nTimestamp: {{timestamp}}',
    nameSuggestion: 'Pre-function Lua Anomaly Guard',
    description: 'Monitors plugin activations for high-risk pre-function or post-function Lua script injectors.'
  },
  metrics: {
    conditions: [
      { field: 'latency_ms', operator: 'greater_than', value: '1000' }
    ],
    template: '⏱ [LATENCY SPIKE] High latency detected on {{target}} ({{status_code}}ms)\nTimestamp: {{timestamp}}',
    nameSuggestion: 'Upstream Latency Spike Monitor',
    description: 'Warns when gateway latency on any upstream target exceeds 1000ms.'
  },
  audit_mutation: {
    conditions: [
      { field: 'action', operator: 'equals', value: 'DELETE' }
    ],
    template: '🛡️ [AUDIT DELETION] Critical {{target}} was deleted by {{actor}}!\nTimestamp: {{timestamp}}',
    nameSuggestion: 'Critical Resource Deletion Guard',
    description: 'Captures mutations deleting essential Services, Routes, or Plugins.'
  },
  ssl_cert: {
    conditions: [
      { field: 'cert_days_left', operator: 'less_equal', value: '30' }
    ],
    template: '🔒 [SSL EXPIRING] Certificate for {{target}} will expire in {{status_code}} days!\nTimestamp: {{timestamp}}',
    nameSuggestion: 'SSL Certificate Expiration Warning',
    description: 'Proactively warns before SSL certificates expire within 30 days.'
  },
  custom: {
    conditions: [
      { field: 'status_code', operator: 'equals', value: '500' }
    ],
    template: '🔔 [ALERT] Event triggered on {{target}} ({{status_code}})\nTimestamp: {{timestamp}}',
    nameSuggestion: 'Custom System Event Rule',
    description: 'Composable criteria evaluating arbitrary payload variables.'
  }
};

export const FIELD_METADATA: Record<
  string,
  {
    label: string;
    description: string;
    type: 'boolean' | 'enum' | 'number' | 'text' | 'list';
    suggestions?: string[];
    placeholder?: string;
    example: string;
  }
> = {
  enabled: {
    label: 'Plugin Enabled State',
    description: 'Status whether the plugin is actively running or disabled',
    type: 'boolean',
    suggestions: ['true', 'false'],
    placeholder: 'true or false',
    example: 'true (alert on active) or false (alert on disabled)'
  },
  plugin_name: {
    label: 'Plugin Name / Type',
    description: 'Name of the Kong plugin (e.g. pre-function, rate-limiting)',
    type: 'list',
    suggestions: ['pre-function,post-function', 'key-auth', 'rate-limiting', 'jwt', 'cors'],
    placeholder: 'e.g. pre-function,post-function',
    example: 'pre-function,post-function'
  },
  action: {
    label: 'Mutation Action',
    description: 'Audit action executed on Kong entity (CREATE, UPDATE, DELETE)',
    type: 'enum',
    suggestions: ['DELETE', 'CREATE', 'UPDATE', 'PATCH'],
    placeholder: 'e.g. DELETE',
    example: 'DELETE'
  },
  status: {
    label: 'Node / Cluster Status',
    description: 'Health status reported by Kong Gateway node',
    type: 'enum',
    suggestions: ['down', 'up', 'unhealthy', 'degraded'],
    placeholder: 'e.g. down',
    example: 'down'
  },
  status_code: {
    label: 'HTTP Status Code',
    description: 'HTTP response status code or comma-separated list',
    type: 'list',
    suggestions: ['500,502,503,504', '500', '502', '503', '504', '401,403', '429'],
    placeholder: 'e.g. 500,502,503,504',
    example: '500,502,503,504'
  },
  latency_ms: {
    label: 'Latency (Milliseconds)',
    description: 'Upstream response time in milliseconds',
    type: 'number',
    suggestions: ['500', '1000', '2000', '5000'],
    placeholder: 'e.g. 1000',
    example: '1000'
  },
  cert_days_left: {
    label: 'Days Before SSL Expiration',
    description: 'Number of days remaining before SSL certificate expires',
    type: 'number',
    suggestions: ['7', '14', '30', '60'],
    placeholder: 'e.g. 30',
    example: '30'
  },
  entity: {
    label: 'Kong Resource Entity',
    description: 'Type of entity modified in audit log',
    type: 'enum',
    suggestions: ['service', 'route', 'plugin', 'consumer', 'upstream', 'certificate'],
    placeholder: 'e.g. service,route',
    example: 'service,route'
  },
  actor: {
    label: 'Actor / Username',
    description: 'Username or service account that triggered the mutation',
    type: 'text',
    suggestions: ['admin', 'anonymous'],
    placeholder: 'e.g. admin',
    example: 'admin'
  },
  scope: {
    label: 'Plugin Scope',
    description: 'Target attachment scope (global, service, route, consumer)',
    type: 'enum',
    suggestions: ['global', 'service', 'route', 'consumer'],
    placeholder: 'e.g. global',
    example: 'global'
  },
  error_rate: {
    label: 'Error Rate Percentage (%)',
    description: 'Calculated 5xx percentage of total traffic',
    type: 'number',
    suggestions: ['5', '10', '25', '50'],
    placeholder: 'e.g. 10',
    example: '10'
  },
  method: {
    label: 'HTTP Method',
    description: 'HTTP request verb used in reachability check',
    type: 'enum',
    suggestions: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
    placeholder: 'e.g. GET',
    example: 'GET'
  },
  target_url: {
    label: 'Target URL / Endpoint',
    description: 'Probe target URL or hostname',
    type: 'text',
    placeholder: 'e.g. https://api.gateway.internal/v1',
    example: 'https://api.gateway.internal/v1'
  },
  sni: {
    label: 'SNI Hostname',
    description: 'Server Name Indication hostname bound to certificate',
    type: 'text',
    placeholder: 'e.g. *.api.enterprise.com',
    example: '*.api.enterprise.com'
  },
  protocols: {
    label: 'Network Protocols',
    description: 'Network communication protocols supported by plugin (http, https, grpc, tcp, etc.)',
    type: 'list',
    suggestions: ['http,https', 'http', 'https', 'grpc,grpcs', 'tcp,udp', 'ws,wss'],
    placeholder: 'e.g. http,https',
    example: 'http,https'
  }
};

const TEMPLATE_VARIABLES = [
  { tag: '{{title}}', label: 'Rule Title' },
  { tag: '{{target}}', label: 'Target / Node' },
  { tag: '{{node_id}}', label: 'Node ID' },
  { tag: '{{node_name}}', label: 'Gateway Node' },
  { tag: '{{plugin_name}}', label: 'Plugin Name' },
  { tag: '{{severity}}', label: 'Severity' },
  { tag: '{{status_code}}', label: 'Status Code' },
  { tag: '{{actor}}', label: 'Actor / User' },
  { tag: '{{timestamp}}', label: 'Timestamp' },
  { tag: '{{kong_url}}', label: 'Kong URL' },
  { tag: '{{noka_url}}', label: 'NoKA URL' },
  { tag: '{{details}}', label: 'Details JSON' }
];

const CHANNEL_ICONS: Record<ChannelKey, { name: string; icon: React.ReactNode; color: string }> = {
  telegram: {
    name: 'Telegram',
    icon: <Send className="w-3 h-3 text-sky-500" />,
    color: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: <MessageSquare className="w-3 h-3 text-emerald-500" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  slack: {
    name: 'Slack',
    icon: <Hash className="w-3 h-3 text-violet-500" />,
    color: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  discord: {
    name: 'Discord',
    icon: <Share2 className="w-3 h-3 text-indigo-500" />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  webhook: {
    name: 'Webhook',
    icon: <Globe className="w-3 h-3 text-slate-600" />,
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

const DEFAULT_WEBHOOK_JSON_TEMPLATE = JSON.stringify(
  {
    event: 'gateway_alert',
    severity: '{{severity}}',
    title: '{{title}}',
    message: '{{message}}',
    details: {
      node_id: '{{node_id}}',
      node_name: '{{node_name}}',
      target: '{{target}}',
      status_code: '{{status_code}}',
      plugin_name: '{{plugin_name}}'
    },
    timestamp: '{{timestamp}}',
    dashboard_url: '{{noka_url}}'
  },
  null,
  2
);

const formatDate = (isoStr?: string): string => {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
};

const timeAgo = (isoStr?: string): string => {
  if (!isoStr) return 'Never triggered';
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    if (isNaN(diffMs)) return 'Never triggered';
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Never triggered';
  }
};

const normalizeCategoryToSource = (cat: ConditionCategory): EventSourceKey => {
  if (cat === 'ping_5xx_failure' || cat === 'reachability_ping') return 'reachability_ping';
  if (cat === 'gateway_node_down' || cat === 'gateway_node') return 'gateway_node';
  if (cat === 'plugin_security_anomaly' || cat === 'plugin_registry') return 'plugin_registry';
  if (cat === 'http_5xx_rate' || cat === 'high_latency' || cat === 'metrics') return 'metrics';
  if (cat === 'critical_config_mutation' || cat === 'audit_mutation') return 'audit_mutation';
  if (cat === 'cert_expiring' || cat === 'ssl_cert') return 'ssl_cert';
  return 'custom';
};

const formatConditionTriggerText = (rule: AlertRule): string => {
  // If rule has composable conditions, format summary
  if (rule.config.conditions && rule.config.conditions.length > 0) {
    const count = rule.config.conditions.length;
    const matchType = rule.config.match_logic || 'AND';
    const firstCond = rule.config.conditions[0];
    const opInfo = OPERATOR_OPTIONS.find((o) => o.value === firstCond.operator);
    const firstStr = `${firstCond.field} ${opInfo?.symbol || firstCond.operator} "${firstCond.value}"`;
    if (count === 1) return firstStr;
    return `${firstStr} (+${count - 1} ${matchType})`;
  }

  // Legacy fallback
  switch (rule.category) {
    case 'plugin_security_anomaly':
    case 'plugin_registry':
      return `⚡ Plugin Scanner (${rule.config.target_plugins || 'pre-function, post-function'})`;
    case 'ping_5xx_failure':
    case 'reachability_ping':
      return `🔴 Ping Check (${rule.config.scope || 'All Targets'})`;
    case 'gateway_node_down':
    case 'gateway_node':
      return '⚠️ Gateway Node Health';
    case 'http_5xx_rate':
      return `📈 5xx Rate > ${rule.config.threshold_rate ?? 5}%`;
    case 'high_latency':
      return `⏱ Latency > ${rule.config.threshold_latency_ms ?? 1000}ms`;
    case 'cert_expiring':
    case 'ssl_cert':
      return `🔒 SSL Expiry < ${rule.config.threshold_cert_days ?? 30}d`;
    case 'critical_config_mutation':
    case 'audit_mutation':
      return '🛡️ Audit Mutation (DELETE / Mutate)';
    default:
      return rule.category;
  }
};

const SeverityBadge: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-xs shadow-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
          Critical
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
          <Flame className="w-3 h-3 text-orange-600" />
          Error
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Warning
        </span>
      );
    case 'info':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
          <Info className="w-3 h-3 text-blue-600" />
          Info
        </span>
      );
  }
};

// ─── Main Alerts Component ────────────────────────────────────────────────────

export const Alerts: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // ── States ──
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [incidents, setIncidents] = useState<IncidentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeNode, setActiveNode] = useState<any>(null);
  const [baseUrl, setBaseUrl] = useState<string>('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');

  // Integrations state from Settings for Header online cards
  const [activeChannelsStatus, setActiveChannelsStatus] = useState<Record<ChannelKey, boolean>>({
    telegram: false,
    whatsapp: false,
    slack: false,
    discord: false,
    webhook: false
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [isTestingModalDispatch, setIsTestingModalDispatch] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Form State (Universal Composable Rule Builder)
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<AlertSeverity>('warning');
  const [formSource, setFormSource] = useState<EventSourceKey>('reachability_ping');
  const [formMatchLogic, setFormMatchLogic] = useState<'AND' | 'OR'>('AND');
  const [formConditions, setFormConditions] = useState<AlertConditionItem[]>([]);
  const [formTemplate, setFormTemplate] = useState('');
  const [formWebhookJson, setFormWebhookJson] = useState('');
  const [templateTab, setTemplateTab] = useState<'message' | 'webhook_json'>('message');
  const [previewTab, setPreviewTab] = useState<'message' | 'webhook_json'>('message');
  const [formChannels, setFormChannels] = useState<ChannelKey[]>(['telegram']);
  const [formCooldownMins, setFormCooldownMins] = useState<number>(5);

  // Expanded Incident Log Detail IDs
  const [expandedIncidentIds, setExpandedIncidentIds] = useState<Set<string>>(new Set());

  // 1-Click Recipe Loader
  const handleApplyRecipe = (recipe: AlertRecipe) => {
    setFormName(recipe.name);
    setFormDescription(recipe.description);
    setFormSeverity(recipe.severity);
    setFormSource(recipe.source);
    setFormMatchLogic(recipe.matchLogic);
    setFormConditions(recipe.conditions.map((c, idx) => ({ ...c, id: `rec_cond_${Date.now()}_${idx}` })));
    setFormTemplate(recipe.template);
    if (recipe.channels && recipe.channels.length > 0) {
      setFormChannels(recipe.channels);
    }
    addToast('success', `Loaded "${recipe.name}" recipe!`, 'Recipe Loaded');
  };

  // Live Interpolated Message Preview with Simulated Realistic Data
  const liveInterpolatedPreview = useMemo(() => {
    if (!formTemplate.trim()) return '';
    let sampleTarget = 'https://api.gateway.internal/v1/payments';
    let sampleStatusCode = '503';
    let sampleNodeName = activeNode?.name || 'kong-staging-34(cluster-kong)';
    if (formSource === 'gateway_node') {
      sampleTarget = activeNode?.name || 'kong-admin-node-01';
      sampleStatusCode = '500';
      sampleNodeName = activeNode?.name || 'kong-admin-node-01';
    } else if (formSource === 'plugin_registry') {
      sampleTarget = 'pre-function';
      sampleStatusCode = '200';
    } else if (formSource === 'ssl_cert') {
      sampleTarget = '*.api.enterprise.com (SNI)';
      sampleStatusCode = '28';
    } else if (formSource === 'audit_mutation') {
      sampleTarget = 'Service (auth-service)';
      sampleStatusCode = '204';
    } else if (formSource === 'metrics') {
      sampleTarget = 'route-checkout-api';
      sampleStatusCode = '1250';
    }

    const sampleTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const sampleDetails = 'Connection timeout to upstream host (ETIMEDOUT 504)';
    const sampleActor = 'devops-admin';
    const sampleTitle = formName.trim() || 'Gateway Alert';
    const sampleMessage = `Alert: ${sampleTitle} triggered on ${sampleTarget}`;

    return formTemplate
      .replace(/\{\{\s*title\s*\}\}/gi, sampleTitle)
      .replace(/\{\{\s*message\s*\}\}/gi, sampleMessage)
      .replace(/\{\{\s*target\s*\}\}/gi, sampleTarget)
      .replace(/\{\{\s*node_id\s*\}\}/gi, activeNode?.id ? String(activeNode.id) : '1')
      .replace(/\{\{\s*node_name\s*\}\}/gi, sampleNodeName)
      .replace(/\{\{\s*plugin_name\s*\}\}/gi, formSource === 'plugin_registry' ? 'pre-function' : sampleTarget)
      .replace(/\{\{\s*resource_name\s*\}\}/gi, sampleTarget)
      .replace(/\{\{\s*namespace_or_service\s*\}\}/gi, sampleNodeName)
      .replace(/\{\{\s*cluster_or_workspace\s*\}\}/gi, 'default')
      .replace(/\{\{\s*event\s*\}\}/gi, 'gateway_alert')
      .replace(/\{\{\s*event_type\s*\}\}/gi, 'gateway_alert')
      .replace(/\{\{\s*source\s*\}\}/gi, formSource)
      .replace(/\{\{\s*category\s*\}\}/gi, formSource)
      .replace(/\{\{\s*severity\s*\}\}/gi, formSeverity.toUpperCase())
      .replace(/\{\{\s*status_code\s*\}\}/gi, sampleStatusCode)
      .replace(/\{\{\s*actor\s*\}\}/gi, sampleActor)
      .replace(/\{\{\s*timestamp\s*\}\}/gi, sampleTimestamp)
      .replace(/\{\{\s*kong_url\s*\}\}/gi, activeNode?.kong_admin_url || 'http://localhost:8081')
      .replace(/\{\{\s*noka_url\s*\}\}/gi, baseUrl || window.location.origin)
      .replace(/\{\{\s*details\s*\}\}/gi, sampleDetails);
  }, [formTemplate, formName, formSeverity, formSource, activeNode, baseUrl]);

  // Live Interpolated Webhook JSON Preview
  const liveWebhookJsonPreview = useMemo(() => {
    let sampleTarget = 'https://api.gateway.internal/v1/payments';
    let sampleStatusCode = '503';
    let sampleNodeName = activeNode?.name || 'kong-staging-34(cluster-kong)';
    let sampleDetails: any = { status_code: 503, target_url: 'https://api.gateway.internal/v1/payments' };
    if (formSource === 'gateway_node') {
      sampleTarget = activeNode?.name || 'kong-admin-node-01';
      sampleStatusCode = '500';
      sampleNodeName = activeNode?.name || 'kong-admin-node-01';
      sampleDetails = { node_id: activeNode?.id ? String(activeNode.id) : '1', node_name: sampleNodeName, status: 'down' };
    } else if (formSource === 'plugin_registry') {
      sampleTarget = 'pre-function';
      sampleStatusCode = '200';
      sampleDetails = { node_id: activeNode?.id ? String(activeNode.id) : '1', node_name: sampleNodeName, plugin_id: '35305d9e-7f1f-4908-8979-0b1aa00b6d2d', plugin_name: 'pre-function' };
    } else if (formSource === 'ssl_cert') {
      sampleTarget = '*.api.enterprise.com (SNI)';
      sampleStatusCode = '28';
      sampleDetails = { snis: ['*.api.enterprise.com'], days_remaining: 28 };
    } else if (formSource === 'audit_mutation') {
      sampleTarget = 'Service (auth-service)';
      sampleStatusCode = '204';
      sampleDetails = { entity: 'service', action: 'DELETE', target: 'auth-service' };
    } else if (formSource === 'metrics') {
      sampleTarget = 'route-checkout-api';
      sampleStatusCode = '1250';
      sampleDetails = { latency_ms: 1250, target: 'route-checkout-api' };
    }

    const sampleTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const sampleActor = 'devops-admin';
    const sampleTitle = formName.trim() || 'Gateway Alert';
    const rawMsg = liveInterpolatedPreview || `Alert: ${sampleTitle} triggered on ${sampleTarget}`;
    // Escape string values cleanly for JSON context so quotes and newlines don't break JSON syntax
    const jsonEscapedMsg = rawMsg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');

    const jsonTemplateToInterpolate = formWebhookJson?.trim() || (formTemplate?.trim().startsWith('{') ? formTemplate.trim() : '');

    if (jsonTemplateToInterpolate) {
      const interpolatedStr = jsonTemplateToInterpolate
        .replace(/\{\{\s*title\s*\}\}/gi, sampleTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*target\s*\}\}/gi, sampleTarget.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*node_id\s*\}\}/gi, activeNode?.id ? String(activeNode.id) : '1')
        .replace(/\{\{\s*node_name\s*\}\}/gi, sampleNodeName.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*plugin_name\s*\}\}/gi, (formSource === 'plugin_registry' ? 'pre-function' : sampleTarget).replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*resource_name\s*\}\}/gi, sampleTarget.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*namespace_or_service\s*\}\}/gi, sampleNodeName.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*cluster_or_workspace\s*\}\}/gi, 'default')
        .replace(/\{\{\s*event\s*\}\}/gi, 'gateway_alert')
        .replace(/\{\{\s*event_type\s*\}\}/gi, 'gateway_alert')
        .replace(/\{\{\s*source\s*\}\}/gi, formSource)
        .replace(/\{\{\s*category\s*\}\}/gi, formSource)
        .replace(/\{\{\s*severity\s*\}\}/gi, formSeverity.toUpperCase())
        .replace(/\{\{\s*status_code\s*\}\}/gi, sampleStatusCode)
        .replace(/\{\{\s*actor\s*\}\}/gi, sampleActor.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
        .replace(/\{\{\s*timestamp\s*\}\}/gi, sampleTimestamp)
        .replace(/\{\{\s*message\s*\}\}/gi, jsonEscapedMsg)
        .replace(/\{\{\s*kong_url\s*\}\}/gi, activeNode?.kong_admin_url || 'http://localhost:8081')
        .replace(/\{\{\s*noka_url\s*\}\}/gi, baseUrl || window.location.origin);

      try {
        const parsed = JSON.parse(interpolatedStr);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // Even if JSON has a temporary syntax error (e.g. trailing comma or missing value), return the interpolated string!
        return interpolatedStr;
      }
    }

    // Default Webhook Payload JSON
    const defaultObj = {
      event: 'gateway_alert',
      severity: formSeverity.toUpperCase(),
      title: sampleTitle,
      message: rawMsg,
      details: sampleDetails,
      timestamp: sampleTimestamp
    };
    return JSON.stringify(defaultObj, null, 2);
  }, [formWebhookJson, formTemplate, liveInterpolatedPreview, formName, formSeverity, formSource, activeNode, baseUrl]);

  // ── Load Data & Persistent Caches ──

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);

      // 1. Load active channels from Settings / integrations config
      const rawIntegrations = localStorage.getItem('noka_integrations_config');
      if (rawIntegrations) {
        try {
          const parsed = JSON.parse(rawIntegrations);
          setActiveChannelsStatus({
            telegram: !!parsed.telegram?.enabled,
            whatsapp: !!parsed.whatsapp?.enabled,
            slack: !!parsed.slack?.enabled,
            discord: !!parsed.discord?.enabled,
            webhook: !!parsed.webhook?.enabled
          });
        } catch {
          // Fallback
        }
      }

      // 1b. Fetch active connection / node
      try {
        const connRes = await axios.get('/api/connections');
        const conns = Array.isArray(connRes.data) ? connRes.data : (connRes.data?.data || []);
        const act = conns.find((c: any) => c.active === true);
        if (act) setActiveNode(act);
      } catch (e) {
        console.error('Failed to load connections:', e);
      }

      // 1c. Fetch settings baseUrl
      try {
        const setRes = await axios.get('/api/settings');
        const settingsData = setRes.data?.data || setRes.data;
        if (settingsData?.baseUrl) {
          setBaseUrl(settingsData.baseUrl.replace(/\/+$/, ''));
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }

      // 2. Fetch Alert Rules from Backend DB
      let loadedRules: AlertRule[] = [];
      try {
        const res = await axios.get('/api/alerts/rules', { timeout: 4000 });
        const rawData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (Array.isArray(rawData)) {
          loadedRules = rawData.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            description: r.description || '',
            enabled: r.enabled !== false,
            severity: r.severity || 'warning',
            category: r.condition_type || 'reachability_ping',
            condition_type: r.condition_type || 'reachability_ping',
            custom_template: r.custom_template || '',
            config: typeof r.condition_config === 'string' ? JSON.parse(r.condition_config || '{}') : (r.condition_config || {}),
            channels: typeof r.channels === 'string' ? JSON.parse(r.channels || '[]') : (r.channels || []),
            cooldown_mins: r.cooldown_minutes || 5,
            created_by: r.created_by,
            created_at: r.created_at || new Date().toISOString(),
            updated_by: r.updated_by,
            updated_at: r.updated_at,
            last_triggered_at: r.last_triggered_at
          }));
        }
      } catch (e) {
        console.error('Failed to fetch alert rules:', e);
      }
      setRules(loadedRules);

      // 3. Fetch Incident Audit Log from Backend DB
      let loadedIncidents: IncidentAuditLog[] = [];
      try {
        const resIncidents = await axios.get('/api/alerts/history', { timeout: 4000 });
        const rawIncData = Array.isArray(resIncidents.data) ? resIncidents.data : (resIncidents.data?.data || []);
        if (Array.isArray(rawIncData)) {
          loadedIncidents = rawIncData.map((inc: any) => ({
            id: String(inc.id),
            rule_id: inc.rule_id ? String(inc.rule_id) : undefined,
            rule_name: inc.rule_name || 'System Alert',
            severity: inc.severity || 'warning',
            category: inc.condition_type || 'reachability_ping',
            message: inc.message || '',
            timestamp: inc.created_at || new Date().toISOString(),
            channels: typeof inc.channels_sent === 'string' ? JSON.parse(inc.channels_sent || '[]') : (inc.channels_sent || []),
            metadata: typeof inc.details === 'string' ? JSON.parse(inc.details || '{}') : (inc.details || {})
          }));
        }
      } catch (e) {
        console.error('Failed to fetch incident logs:', e);
      }
      setIncidents(loadedIncidents);
    } catch {
      addToast('error', 'Failed to synchronize alert configurations', 'Alerts Sync');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    // Clean old mock caches on mount
    localStorage.removeItem('noka_alert_rules');
    localStorage.removeItem('noka_alert_history');
    loadData();
  }, [loadData]);

  // ── Keyboard Listener for Modal (Escape) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen && e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // ── Header Stats Calculation ──
  const stats = useMemo(() => {
    const activeCount = rules.filter((r) => r.enabled).length;
    const totalCount = rules.length;
    const criticalCount = rules.filter((r) => r.enabled && r.severity === 'critical').length;

    // Incidents in last 24h
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const incidents24h = incidents.filter((inc) => {
      const incTime = new Date(inc.timestamp).getTime();
      return !isNaN(incTime) && incTime >= oneDayAgo;
    }).length;

    const onlineChannelsCount = Object.values(activeChannelsStatus).filter(Boolean).length;

    return {
      activeCount,
      totalCount,
      criticalCount,
      incidents24h,
      onlineChannelsCount
    };
  }, [rules, incidents, activeChannelsStatus]);

  // ── Filtered Rules & Incidents ──
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch =
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || rule.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [rules, searchQuery, severityFilter]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        inc.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [incidents, searchQuery, severityFilter]);

  // ── Actions: Toggle Rule Status ──
  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await axios.patch(`/api/alerts/rules/${rule.id}/toggle`);
      const updatedStatus = !rule.enabled;
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: updatedStatus } : r))
      );
      addToast(
        'success',
        `Rule "${rule.name}" is now ${updatedStatus ? 'ACTIVE' : 'MUTED'}.`,
        'Rule Toggled'
      );
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to toggle rule.', 'Toggle Failed');
    }
  };

  // ── Actions: Test Rule Dispatch ──
  const handleTestRule = async (rule: AlertRule) => {
    setTestingRuleId(rule.id);
    try {
      const res = await axios.post('/api/alerts/rules/test', {
        name: rule.name,
        condition_type: rule.category,
        severity: rule.severity,
        channels: rule.channels,
        custom_template: rule.custom_template || rule.config?.custom_template || '',
        condition_config: rule.config
      });
      addToast(
        'success',
        res.data?.message || `Dispatched test probe for "${rule.name}" to [${rule.channels.join(', ')}]`,
        'Test Alert Sent'
      );
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to dispatch test probe.', 'Test Failed');
    } finally {
      setTestingRuleId(null);
    }
  };

  // ── Actions: Delete Rule ──
  const handleDeleteRule = async (rule: AlertRule) => {
    const confirmed = await confirm({
      title: 'Delete Alert Rule',
      message: `Are you sure you want to permanently delete the rule "${rule.name}"? This action cannot be undone.`,
      confirmText: 'Delete Rule',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await axios.delete(`/api/alerts/rules/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      addToast('success', `Alert rule "${rule.name}" deleted.`, 'Rule Removed');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to delete rule.', 'Delete Failed');
    }
  };

  // ── Actions: Clear History ──
  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: 'Clear Incident Audit Log',
      message: 'Are you sure you want to clear all recorded incident audit history? This action will purge all event logs.',
      confirmText: 'Clear All History',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await axios.delete('/api/alerts/history');
      setIncidents([]);
      addToast('success', 'Incident audit log cleared.', 'Audit Purged');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to clear history.', 'Clear Failed');
    }
  };

  // ── Condition Row Operations ──
  const handleSelectEventSource = (srcKey: EventSourceKey) => {
    setFormSource(srcKey);
    const defaults = SOURCE_DEFAULTS[srcKey];
    if (defaults) {
      setFormConditions(
        defaults.conditions.map((c, idx) => ({
          ...c,
          id: `cond_${Date.now()}_${idx}`
        }))
      );
      setFormTemplate(defaults.template);
      // If user hasn't typed a custom rule name or it's currently a recipe/default name, suggest the source's name
      if (!formName.trim() || Object.values(SOURCE_DEFAULTS).some((d) => d.nameSuggestion === formName) || ALERT_RECIPES.some((r) => r.name === formName)) {
        setFormName(defaults.nameSuggestion);
      }
      if (!formDescription.trim() || Object.values(SOURCE_DEFAULTS).some((d) => d.description === formDescription) || ALERT_RECIPES.some((r) => r.description === formDescription)) {
        setFormDescription(defaults.description);
      }
    } else {
      const srcFields = EVENT_SOURCES[srcKey]?.fields || ['status_code'];
      setFormConditions([
        {
          id: `cond_${Date.now()}_0`,
          field: srcFields[0] || 'status_code',
          operator: 'equals',
          value: ''
        }
      ]);
    }
  };

  const handleAddCondition = (initialField?: string) => {
    const sourceFields = EVENT_SOURCES[formSource]?.fields || ['status_code'];
    const field = initialField || sourceFields[0] || 'status_code';
    const newCondition: AlertConditionItem = {
      id: 'cond_' + Math.random().toString(36).substring(2, 9),
      field,
      operator: 'equals',
      value: ''
    };
    setFormConditions([...formConditions, newCondition]);
  };

  const handleUpdateCondition = (id: string, updates: Partial<AlertConditionItem>) => {
    setFormConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleRemoveCondition = (id: string) => {
    setFormConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const webhookTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertTemplateVar = (tag: string) => {
    const isWebhookTab = templateTab === 'webhook_json';
    const textarea = isWebhookTab ? webhookTextareaRef.current : templateTextareaRef.current;
    
    if (!textarea) {
      if (isWebhookTab) {
        setFormWebhookJson((prev) => (prev ? `${prev} ${tag}` : tag));
      } else {
        setFormTemplate((prev) => (prev ? `${prev} ${tag}` : tag));
      }
      return;
    }

    textarea.focus();
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;

    // Use document.execCommand('insertText') if supported to preserve native browser undo (Ctrl+Z)
    let insertedViaCommand = false;
    try {
      insertedViaCommand = document.execCommand('insertText', false, tag);
    } catch {
      insertedViaCommand = false;
    }

    if (!insertedViaCommand) {
      const currentVal = textarea.value;
      const nextVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
      if (isWebhookTab) {
        setFormWebhookJson(nextVal);
      } else {
        setFormTemplate(nextVal);
      }
      // Restore cursor position right after the inserted tag on next tick
      setTimeout(() => {
        const activeRef = isWebhookTab ? webhookTextareaRef.current : templateTextareaRef.current;
        if (activeRef) {
          activeRef.focus();
          const nextCursor = start + tag.length;
          activeRef.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
    }
  };

  const handleResetWebhookJson = () => {
    setFormWebhookJson(DEFAULT_WEBHOOK_JSON_TEMPLATE);
    addToast('info', 'Webhook JSON template reset to default structure.', 'Template Reset');
  };

  // ── Modal Actions: Open Create / Edit ──
  const openCreateModal = () => {
    setEditingRule(null);
    setFormName('');
    setFormDescription('');
    setFormSeverity('warning');
    const defaultSource: EventSourceKey = 'reachability_ping';
    setFormSource(defaultSource);
    setFormMatchLogic('AND');
    setFormConditions([
      {
        id: 'cond_1',
        field: 'status_code',
        operator: 'greater_equal',
        value: '500'
      }
    ]);
    setFormTemplate('🚨 [{{severity}}] Alert: {{title}} triggered on {{target}} at {{timestamp}}.\nDetails: {{details}}');
    setFormWebhookJson(DEFAULT_WEBHOOK_JSON_TEMPLATE);
    setTemplateTab('message');
    setPreviewTab('message');
    setFormChannels(['telegram']);
    setFormCooldownMins(5);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || '');
    setFormSeverity(rule.severity);
    const source = normalizeCategoryToSource(rule.category);
    setFormSource(source);
    setFormMatchLogic(rule.config.match_logic || 'AND');

    // Populate conditions: if explicit conditions exist, use them; otherwise synthesize from config
    if (rule.config.conditions && rule.config.conditions.length > 0) {
      setFormConditions(rule.config.conditions);
    } else {
      const synConditions: AlertConditionItem[] = [];
      if (rule.config.target_plugins) {
        synConditions.push({
          id: 'cond_1',
          field: 'plugin_name',
          operator: 'in_list',
          value: rule.config.target_plugins
        });
      } else if (rule.config.threshold_rate !== undefined) {
        synConditions.push({
          id: 'cond_1',
          field: 'threshold_rate',
          operator: 'greater_than',
          value: String(rule.config.threshold_rate)
        });
      } else if (rule.config.threshold_latency_ms !== undefined) {
        synConditions.push({
          id: 'cond_1',
          field: 'threshold_latency_ms',
          operator: 'greater_than',
          value: String(rule.config.threshold_latency_ms)
        });
      } else if (rule.config.threshold_cert_days !== undefined) {
        synConditions.push({
          id: 'cond_1',
          field: 'threshold_cert_days',
          operator: 'less_than',
          value: String(rule.config.threshold_cert_days)
        });
      } else {
        synConditions.push({
          id: 'cond_1',
          field: EVENT_SOURCES[source].fields[0] || 'status_code',
          operator: 'equals',
          value: ''
        });
      }
      setFormConditions(synConditions);
    }

    setFormTemplate(rule.custom_template || rule.config?.custom_template || '');
    setFormWebhookJson(rule.config?.webhook_payload_template || DEFAULT_WEBHOOK_JSON_TEMPLATE);
    setTemplateTab('message');
    setPreviewTab('message');
    setFormChannels(rule.channels && rule.channels.length > 0 ? rule.channels : ['telegram']);
    setFormCooldownMins(rule.cooldown_mins ?? 5);
    setIsModalOpen(true);
  };

  const toggleChannelSelection = (ch: ChannelKey) => {
    if (formChannels.includes(ch)) {
      if (formChannels.length === 1) {
        addToast('error', 'At least one dispatch channel must be selected.', 'Validation');
        return;
      }
      const updatedChannels = formChannels.filter((c) => c !== ch);
      setFormChannels(updatedChannels);
      if (ch === 'webhook') {
        // When webhook is unselected, reset preview and template tab back to standard message
        setPreviewTab('message');
        setTemplateTab('message');
      }
    } else {
      const nextChannels = [...formChannels, ch];
      setFormChannels(nextChannels);
      if (ch === 'webhook') {
        // Automatically switch to Webhook JSON tab and preview
        setTemplateTab('webhook_json');
        setPreviewTab('webhook_json');
      }
    }
  };

  // ── Modal Actions: Save Rule ──
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('error', 'Rule name is required.', 'Validation');
      return;
    }

    setModalLoading(true);

    const config: AlertRuleConfig = {
      match_logic: formMatchLogic,
      conditions: formConditions,
      custom_template: formTemplate.trim(),
      webhook_payload_template: formWebhookJson.trim()
    };

    // Backward compatibility mappings
    for (const cond of formConditions) {
      if (cond.field === 'plugin_name' || cond.field === 'target_plugins') {
        config.target_plugins = cond.value;
      } else if (cond.field === 'threshold_rate' || cond.field === '5xx_rate') {
        config.threshold_rate = Number(cond.value) || 5;
      } else if (cond.field === 'threshold_latency_ms' || cond.field === 'latency_ms') {
        config.threshold_latency_ms = Number(cond.value) || 1000;
      } else if (cond.field === 'threshold_cert_days' || cond.field === 'cert_days_left') {
        config.threshold_cert_days = Number(cond.value) || 30;
      } else if (cond.field === 'scope') {
        config.scope = cond.value;
      }
    }

    const backendPayload = {
      name: formName.trim(),
      description: formDescription.trim(),
      enabled: editingRule ? editingRule.enabled : true,
      severity: formSeverity,
      condition_type: formSource,
      condition_config: config,
      custom_template: formTemplate.trim(),
      channels: formChannels,
      cooldown_minutes: Number(formCooldownMins)
    };

    try {
      if (editingRule) {
        await axios.put(`/api/alerts/rules/${editingRule.id}`, backendPayload);
        addToast('success', `Alert rule "${backendPayload.name}" updated successfully.`, 'Rule Saved');
      } else {
        await axios.post('/api/alerts/rules', backendPayload);
        addToast('success', `New alert rule "${backendPayload.name}" registered.`, 'Rule Created');
      }
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || err.message || 'Failed to save alert rule.', 'Save Failed');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Modal Actions: Test Dispatch from Modal ──
  const handleTestModalDispatch = async () => {
    setIsTestingModalDispatch(true);
    try {
      const config: AlertRuleConfig = {
        match_logic: formMatchLogic,
        conditions: formConditions,
        custom_template: formTemplate.trim(),
        webhook_payload_template: formWebhookJson.trim()
      };

      const res = await axios.post('/api/alerts/rules/test', {
        name: formName || 'Preview Test Rule',
        condition_type: formSource,
        severity: formSeverity,
        channels: formChannels,
        custom_template: formTemplate.trim(),
        condition_config: config
      });
      addToast('success', res.data?.message || `Test alert dispatched to [${formChannels.join(', ')}]!`, 'Test Probe Sent');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || err.message || 'Failed to dispatch test probe.', 'Test Failed');
    } finally {
      setIsTestingModalDispatch(false);
    }
  };

  // Toggle incident expand details
  const toggleExpandIncident = (id: string) => {
    setExpandedIncidentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sentinel Incident & Threat Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <BellRing className="w-7 h-7 text-brand-primary" />
              Alert Rules & Incident Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Define composable multi-criteria alert rules, synthetic reachability ping monitors, node outage alarms, and dispatch instant notifications across Telegram, WhatsApp, Slack, Discord, and Webhooks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Alert Rule
            </button>
          </div>
        </div>
      </div>

      {/* ── Top Header Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Rules */}
        <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Active Rules</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-text-primary">{stats.activeCount}</span>
              <span className="text-xs text-text-muted">/ {stats.totalCount} configured</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-brand-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Incidents (24h) */}
        <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Incidents (24h)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">{stats.incidents24h}</span>
              <span className="text-xs text-text-muted">triggered</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Critical Severity Rules */}
        <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Critical Rules</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{stats.criticalCount}</span>
              <span className="text-xs text-text-muted">high priority</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Channels Online */}
        <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Channels Status</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              5 Available
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['telegram', 'whatsapp', 'slack', 'discord', 'webhook'] as ChannelKey[]).map((ch) => {
              const info = CHANNEL_ICONS[ch];
              const isEnabled = activeChannelsStatus[ch];
              return (
                <div
                  key={ch}
                  title={`${info.name}: ${isEnabled ? 'Configured & Online' : 'Not configured in Settings'}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-all ${
                    isEnabled
                      ? `${info.color} font-semibold shadow-xs`
                      : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                  }`}
                >
                  {info.icon}
                  <span className="hidden sm:inline">{info.name}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Action & Filter Bar ── */}
      <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-white text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Layers className="w-4 h-4 text-brand-primary" />
            <span>ALERT RULES</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] text-text-secondary">
              {rules.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <History className="w-4 h-4 text-rose-500" />
            <span>INCIDENT AUDIT LOG</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] text-text-secondary">
              {incidents.length}
            </span>
          </button>
        </div>

        {/* Search, Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'rules' ? 'Search alert rules...' : 'Search incidents...'}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border-light bg-slate-50/50 focus:bg-white focus:outline-none focus:border-brand-primary transition-all text-text-primary placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50/70 border border-border-light px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-[11px] font-bold text-text-muted uppercase">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | AlertSeverity)}
              className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            title="Refresh Alert Rules & Incidents"
            disabled={refreshing}
            className="p-2 rounded-lg border border-border-light bg-white hover:bg-slate-50 text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── TAB 1: ALERT RULES ── */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                  <th className="py-3 px-4 w-16 text-center">Status</th>
                  <th className="py-3 px-4 min-w-[240px]">Rule Info & Authorship</th>
                  <th className="py-3 px-4 w-28">Severity</th>
                  <th className="py-3 px-4 min-w-[240px]">Condition Trigger</th>
                  <th className="py-3 px-4 min-w-[170px]">Channels</th>
                  <th className="py-3 px-4 w-24">Cooldown</th>
                  <th className="py-3 px-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                        <p className="text-xs font-semibold text-text-secondary">Loading Alert Rules...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="p-3 rounded-full bg-slate-100 w-fit mx-auto text-text-muted">
                          <BellRing className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-text-primary">No Alert Rules Found</p>
                        <p className="text-xs text-text-muted">
                          {searchQuery || severityFilter !== 'all'
                            ? 'Try clearing the search query or severity filter.'
                            : 'Click "+ Create Alert Rule" to configure your first sentinel rule.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const sourceKey = normalizeCategoryToSource(rule.category);
                    const sourceInfo = EVENT_SOURCES[sourceKey] || EVENT_SOURCES.custom;
                    const conditionText = formatConditionTriggerText(rule);
                    const isUpdated = rule.updated_at && rule.created_at && rule.updated_at !== rule.created_at;

                    return (
                      <tr
                        key={rule.id}
                        className={`transition-colors hover:bg-slate-50/70 ${
                          !rule.enabled ? 'opacity-65 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Status Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule)}
                            title={rule.enabled ? 'Click to disable rule' : 'Click to enable rule'}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                rule.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Name, Description & Authorship Metadata */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="font-bold text-text-primary flex items-center gap-1.5">
                              <span>{rule.name}</span>
                              {!rule.enabled && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
                                  PAUSED
                                </span>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-[11px] text-text-muted line-clamp-1 max-w-sm">
                                {rule.description}
                              </p>
                            )}

                            {/* Authorship & Timestamp Metadata */}
                            <div className="flex flex-col gap-0.5 pt-1 text-[10px] text-text-muted border-t border-slate-100">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Created by <strong className="text-text-secondary">{rule.created_by || 'admin'}</strong></span>
                                <span>•</span>
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{formatDate(rule.created_at)}</span>
                              </div>

                              {isUpdated && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <History className="w-3 h-3" />
                                  <span>Updated by <strong className="text-text-secondary">{rule.updated_by || rule.created_by || 'admin'}</strong></span>
                                  <span>•</span>
                                  <span>{formatDate(rule.updated_at)}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                <Radio className="w-3 h-3 text-indigo-400" />
                                <span>
                                  Last triggered:{' '}
                                  <span className={rule.last_triggered_at ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                                    {timeAgo(rule.last_triggered_at)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="py-4 px-4">
                          <SeverityBadge severity={rule.severity} />
                        </td>

                        {/* Condition Trigger */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${sourceInfo.color}`}
                            >
                              {sourceInfo.icon}
                              <span>{conditionText}</span>
                            </span>
                          </div>
                        </td>

                        {/* Channels */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {rule.channels.map((ch) => {
                              const chInfo = CHANNEL_ICONS[ch];
                              if (!chInfo) return null;
                              return (
                                <span
                                  key={ch}
                                  title={`Dispatches to ${chInfo.name}`}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${chInfo.color}`}
                                >
                                  {chInfo.icon}
                                  <span>{chInfo.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Cooldown */}
                        <td className="py-4 px-4 text-text-secondary font-medium">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {rule.cooldown_mins}m
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Test Rule Button */}
                            <button
                              type="button"
                              onClick={() => handleTestRule(rule)}
                              disabled={testingRuleId === rule.id}
                              title="Test Rule Dispatch"
                              className="p-1.5 rounded-lg border border-border-light bg-white hover:bg-slate-100 text-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Play
                                className={`w-3.5 h-3.5 ${
                                  testingRuleId === rule.id ? 'animate-pulse text-emerald-400' : ''
                                }`}
                              />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(rule)}
                              title="Edit Rule"
                              className="p-1.5 rounded-lg border border-border-light bg-white hover:bg-slate-100 text-text-secondary hover:text-brand-primary transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule)}
                              title="Delete Rule"
                              className="p-1.5 rounded-lg border border-border-light bg-white hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: INCIDENT AUDIT LOG ── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-light">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Triggered Incidents & Notification Audit
              </h2>
            </div>
            {incidents.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-3 w-40">Timestamp</th>
                  <th className="py-3 px-3 w-28">Severity</th>
                  <th className="py-3 px-3 min-w-[180px]">Rule & Condition</th>
                  <th className="py-3 px-3 min-w-[280px]">Incident Summary</th>
                  <th className="py-3 px-3 min-w-[160px]">Delivery Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                        <p className="text-xs font-semibold text-text-secondary">Loading Incident History...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="p-3 rounded-full bg-slate-100 w-fit mx-auto text-text-muted">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="font-bold text-text-primary">No Incidents Triggered</p>
                        <p className="text-xs text-text-muted">
                          All systems normal. No active threat or anomaly alerts recorded.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => {
                    const isExpanded = expandedIncidentIds.has(incident.id);
                    const formattedDate = new Date(incident.timestamp).toLocaleString();

                    return (
                      <React.Fragment key={incident.id}>
                        <tr
                          onClick={() => toggleExpandIncident(incident.id)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Expand chevron */}
                          <td className="py-3.5 px-3 text-center text-text-muted group-hover:text-text-primary">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-brand-primary" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-3 text-[11px] font-mono text-text-secondary whitespace-nowrap">
                            {formattedDate}
                          </td>

                          {/* Severity */}
                          <td className="py-3.5 px-3">
                            <SeverityBadge severity={incident.severity} />
                          </td>

                          {/* Rule & Condition */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-text-primary">{incident.rule_name}</p>
                              <span className="text-[10px] font-mono text-text-muted block">
                                {incident.category}
                              </span>
                            </div>
                          </td>

                          {/* Message */}
                          <td className="py-3.5 px-3 text-text-secondary leading-relaxed">
                            {incident.message}
                          </td>

                          {/* Channel Delivery Badges */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {incident.channels.map((ch, idx) => {
                                const chInfo = CHANNEL_ICONS[ch.channel];
                                const isSuccess = ch.status === 'sent';
                                return (
                                  <span
                                    key={idx}
                                    title={`Status: ${ch.status} at ${new Date(ch.delivered_at).toLocaleTimeString()}`}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      isSuccess
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    {chInfo?.icon}
                                    <span>{chInfo?.name}</span>
                                    {isSuccess ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Drawer / JSON detail row */}
                        {isExpanded && (
                          <tr className="bg-slate-900 text-slate-100 animate-fadeIn">
                            <td colSpan={6} className="p-4 sm:p-5">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-700 pb-2">
                                  <div className="flex items-center gap-2 font-bold text-white">
                                    <FileCode2 className="w-4 h-4 text-brand-primary" />
                                    <span>Incident Payload Details (Event ID: {incident.id})</span>
                                  </div>
                                  <span className="font-mono text-[11px] text-slate-400">
                                    Triggered: {incident.timestamp}
                                  </span>
                                </div>
                                <pre className="text-[11px] font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-emerald-400 overflow-x-auto">
                                  {JSON.stringify(
                                    {
                                      id: incident.id,
                                      rule_id: incident.rule_id,
                                      rule_name: incident.rule_name,
                                      severity: incident.severity,
                                      category: incident.category,
                                      message: incident.message,
                                      channels: incident.channels,
                                      metadata: incident.metadata
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT UNIVERSAL COMPOSABLE ALERT RULE BUILDER MODAL ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
          onMouseDown={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-2xl border border-border-light shadow-2xl overflow-hidden my-6 animate-scaleUp flex flex-col max-h-[90vh]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                    <span>{editingRule ? 'Edit Composable Alert Rule' : 'Universal Composable Alert Rule Builder'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-primary/20 text-brand-primary">
                      v2.15
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted">
                    Build multi-condition triggers with AND/OR logic, dynamic operators, and custom notification templates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleSaveRule} className="p-6 space-y-6 overflow-y-auto text-xs">
              {/* ── 1-Click Example Recipes / Quick Templates Bar ── */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                      1-Click Example Recipes / Quick Templates
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Click any recipe card to populate form</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {ALERT_RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => handleApplyRecipe(recipe)}
                      title={`${recipe.description} (Click to load)`}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-xs hover:scale-[1.01] active:scale-[0.99] ${recipe.badgeColor}`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-xs leading-snug flex items-center gap-1.5">
                          <span>{recipe.badge}</span>
                        </div>
                        <p className="text-[10px] opacity-80 line-clamp-2 leading-relaxed font-normal">
                          {recipe.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-current/15 text-[9px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-black/10 uppercase tracking-wider">
                          {recipe.source.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/15 font-extrabold uppercase tracking-wider">
                          {recipe.severity}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Expandable Alert Rule Guide & Field Reference Accordion ── */}
              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(!isGuideOpen)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-indigo-100/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-950">
                      ℹ️ Alert Rule Guide & Field Reference
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/70 text-indigo-800">
                      Cheatsheet & Syntax
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                    <span>{isGuideOpen ? 'Hide Guide' : 'Show Guide'}</span>
                    {isGuideOpen ? (
                      <ChevronDown className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                </button>

                {isGuideOpen && (
                  <div className="p-4 space-y-4 border-t border-indigo-100 bg-white text-text-primary animate-fadeIn text-xs">
                    {/* Event Sources & Available Fields */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        <Activity className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Event Sources & Available Query Fields</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 space-y-1">
                          <div className="font-bold text-rose-950 flex items-center gap-1.5">
                            <Radio className="w-3 h-3 text-rose-500" />
                            <span>Reachability Ping</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Status codes, URLs, Latency & Synthetic probes</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['status_code', 'target_url', 'latency_ms', 'method'].map((f) => (
                              <code key={f} className="px-1.5 py-0.5 rounded bg-white border border-rose-200 text-rose-700 font-mono text-[10px]">
                                {f}
                              </code>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 space-y-1">
                          <div className="font-bold text-red-950 flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-red-600" />
                            <span>Gateway Node</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Kong Admin API cluster node health & status</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['status', 'node_name', 'node_url'].map((f) => (
                              <code key={f} className="px-1.5 py-0.5 rounded bg-white border border-red-200 text-red-700 font-mono text-[10px]">
                                {f}
                              </code>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 space-y-1">
                          <div className="font-bold text-amber-950 flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-amber-600" />
                            <span>Plugins Registry</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Security scanner & plugin configurations</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['plugin_name', 'scope', 'enabled'].map((f) => (
                              <code key={f} className="px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-800 font-mono text-[10px]">
                                {f}
                              </code>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50/50 space-y-1">
                          <div className="font-bold text-orange-950 flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-orange-600" />
                            <span>Metrics Prometheus</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Throughput, error rates, request counts & latencies</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['error_rate', 'latency_ms', 'total_requests', 'status_code'].map((f) => (
                              <code key={f} className="px-1.5 py-0.5 rounded bg-white border border-orange-200 text-orange-800 font-mono text-[10px]">
                                {f}
                              </code>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/50 space-y-1">
                          <div className="font-bold text-purple-950 flex items-center gap-1.5">
                            <ShieldAlert className="w-3 h-3 text-purple-600" />
                            <span>Audit Mutation</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Entity mutations, deletion & actions</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['entity', 'action', 'actor'].map((f) => (
                              <code key={f} className="px-1.5 py-0.5 rounded bg-white border border-purple-200 text-purple-800 font-mono text-[10px]">
                                {f}
                              </code>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 space-y-1">
                          <div className="font-bold text-blue-950 flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-blue-600" />
                            <span>SSL Certificate</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Days before expiration, SANs & SSL validity</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['cert_days_left', 'sni', 'issuer'].map((f) => (
                              <code key={f} className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800 font-mono text-[10px]">
                                {f}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Field Value Directory & Accepted Formats */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        <Sliders className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Query Fields Directory & What Values to Fill</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-text-muted font-bold text-[10px] uppercase">
                            <tr>
                              <th className="py-2 px-3">Field Name</th>
                              <th className="py-2 px-3">Type</th>
                              <th className="py-2 px-3">Description</th>
                              <th className="py-2 px-3">Accepted / Example Values</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(FIELD_METADATA).map(([key, meta]) => (
                              <tr key={key} className="hover:bg-slate-50/60">
                                <td className="py-2 px-3 font-mono font-bold text-brand-primary">
                                  {key}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-bold">
                                    {meta.type}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-text-secondary text-[11px]">
                                  {meta.description}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-800">
                                  {meta.suggestions ? (
                                    <div className="flex flex-wrap gap-1">
                                      {meta.suggestions.map((s) => (
                                        <code key={s} className="px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px]">
                                          {s}
                                        </code>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-text-muted">{meta.example}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Operators Cheat-Sheet */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        <Sliders className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Condition Operators Cheat-Sheet</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between font-mono font-bold text-xs text-text-primary">
                            <span>equals / not_equals</span>
                            <span className="text-brand-primary font-bold">=, !=</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Exact string or number comparison (e.g. <code>status equals down</code>, <code>action equals DELETE</code>).
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between font-mono font-bold text-xs text-text-primary">
                            <span>greater_than / less_than</span>
                            <span className="text-brand-primary font-bold">&gt;, &lt;, &gt;=, &lt;=</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Numeric comparisons (e.g. <code>latency_ms &gt; 1000</code>, <code>cert_days_left &lt;= 30</code>).
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between font-mono font-bold text-xs text-text-primary">
                            <span>in_list</span>
                            <span className="text-brand-primary font-bold">∈ [list]</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Comma-separated list (e.g. <code>500,502,503,504</code> or <code>pre-function,post-function</code>).
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between font-mono font-bold text-xs text-text-primary">
                            <span>contains / not_contains</span>
                            <span className="text-brand-primary font-bold">substring</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Partial substring matching (e.g. <code>target_url contains /payment</code>).
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                          <div className="flex items-center justify-between font-mono font-bold text-xs text-text-primary">
                            <span>regex_match</span>
                            <span className="text-brand-primary font-bold">.*</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Regular expression pattern matching (e.g. <code>^5[0-9]&#123;2&#125;$</code> or <code>.*auth.*</code>).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Variables Reference */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-primary">
                        <Variable className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Dynamic Variables Reference</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { tag: '{{target}}', desc: 'Target URL, node name, plugin name, or entity affected.' },
                          { tag: '{{status_code}}', desc: 'HTTP status code or metric number.' },
                          { tag: '{{actor}}', desc: 'Username who performed the action.' },
                          { tag: '{{timestamp}}', desc: 'Exact event timestamp.' },
                          { tag: '{{kong_url}}', desc: 'Kong Admin API / Node Gateway URL.' },
                          { tag: '{{noka_url}}', desc: 'NoKA Dashboard Management Link.' },
                          { tag: '{{details}}', desc: 'Technical error message or additional context.' },
                          { tag: '{{severity}}', desc: 'Severity level of the alert.' },
                          { tag: '{{title}}', desc: 'Rule name or alert title.' }
                        ].map((item) => (
                          <div key={item.tag} className="p-2 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                            <span className="font-mono font-bold text-xs text-brand-primary">{item.tag}</span>
                            <p className="text-[10px] text-text-muted leading-tight">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1: Rule Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border-light text-[11px] font-bold uppercase tracking-wider text-text-primary">
                  <Info className="w-3.5 h-3.5 text-brand-primary" />
                  <span>1. Basic Rule Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-text-primary block">
                      Rule Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Critical 5xx Spike on Payment Gateway"
                      className="w-full px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:border-brand-primary text-text-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-text-primary block">Severity</label>
                    <select
                      value={formSeverity}
                      onChange={(e) => setFormSeverity(e.target.value as AlertSeverity)}
                      className="w-full px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:border-brand-primary text-text-primary cursor-pointer text-xs font-semibold"
                    >
                      <option value="info">Info (Informational)</option>
                      <option value="warning">Warning (Notice)</option>
                      <option value="error">Error (High Priority)</option>
                      <option value="critical">Critical (Urgent P0)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-text-primary block">Description (Optional)</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide context or remediation instructions for on-call engineers..."
                    className="w-full px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:border-brand-primary text-text-primary text-xs"
                  />
                </div>
              </div>

              {/* Section 2: Event Source Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border-light text-[11px] font-bold uppercase tracking-wider text-text-primary">
                  <Activity className="w-3.5 h-3.5 text-brand-primary" />
                  <span>2. Event Source Selector</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(Object.keys(EVENT_SOURCES) as EventSourceKey[]).map((srcKey) => {
                    const src = EVENT_SOURCES[srcKey];
                    const isSelected = formSource === srcKey;
                    return (
                      <button
                        type="button"
                        key={srcKey}
                        onClick={() => handleSelectEventSource(srcKey)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'border-brand-primary bg-brand-primary/5 text-text-primary shadow-xs ring-1 ring-brand-primary'
                            : 'border-border-light bg-white hover:bg-slate-50 text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg border ${src.color}`}>
                            {src.icon}
                          </div>
                          <span className="font-bold text-xs text-text-primary leading-tight">
                            {src.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
                          {src.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Dynamic Composable Condition Criteria List */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-border-light">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                      3. Dynamic Condition Criteria ({formConditions.length})
                    </span>
                  </div>

                  {/* Match Logic Toggle: Match ALL (AND) vs Match ANY (OR) */}
                  <div className="flex items-center gap-1.5 bg-white border border-border-light p-1 rounded-lg">
                    <span className="text-[10px] font-bold text-text-muted px-1.5 uppercase">Match Logic:</span>
                    <button
                      type="button"
                      onClick={() => setFormMatchLogic('AND')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                        formMatchLogic === 'AND'
                          ? 'bg-brand-primary text-slate-950 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      ALL Conditions (AND)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMatchLogic('OR')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                        formMatchLogic === 'OR'
                          ? 'bg-brand-primary text-slate-950 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      ANY Condition (OR)
                    </button>
                  </div>
                </div>

                {/* Condition Rows List */}
                <div className="space-y-2.5 pt-1">
                  {formConditions.length === 0 ? (
                    <div className="p-4 text-center rounded-lg border border-dashed border-border-light bg-white">
                      <p className="text-xs text-text-muted">
                        No conditions added. Click <strong>+ Add Condition</strong> below to define triggers.
                      </p>
                    </div>
                  ) : (
                    formConditions.map((cond, idx) => {
                      const sourceFields = EVENT_SOURCES[formSource]?.fields || [];
                      const selectedOp = OPERATOR_OPTIONS.find((o) => o.value === cond.operator);
                      const fieldMeta = FIELD_METADATA[cond.field];
                      return (
                        <div
                          key={cond.id}
                          className="p-3 rounded-xl bg-white border border-border-light shadow-xs space-y-2 animate-fadeIn"
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>

                              {/* Field Selector / Custom Input */}
                              <div className="w-36 sm:w-48">
                                <select
                                  value={cond.field}
                                  onChange={(e) => {
                                    const nextField = e.target.value;
                                    const meta = FIELD_METADATA[nextField];
                                    handleUpdateCondition(cond.id, {
                                      field: nextField,
                                      value: meta?.type === 'boolean' ? 'true' : (meta?.suggestions?.[0] || '')
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-md border border-border-light bg-white focus:outline-none focus:border-brand-primary text-xs font-mono font-bold text-text-primary cursor-pointer"
                                >
                                  {sourceFields.map((f) => (
                                    <option key={f} value={f}>
                                      {f} {FIELD_METADATA[f] ? `(${FIELD_METADATA[f].label})` : ''}
                                    </option>
                                  ))}
                                  {!sourceFields.includes(cond.field) && (
                                    <option value={cond.field}>{cond.field} (Custom)</option>
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* Operator Selector */}
                            <div className="w-full sm:w-44">
                              <select
                                value={cond.operator}
                                onChange={(e) =>
                                  handleUpdateCondition(cond.id, {
                                    operator: e.target.value as ConditionOperator
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-md border border-border-light bg-white focus:outline-none focus:border-brand-primary text-xs font-semibold text-text-primary cursor-pointer"
                              >
                                {OPERATOR_OPTIONS.map((op) => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Value Input */}
                            <div className="flex-1 min-w-[140px]">
                              <input
                                type="text"
                                value={cond.value}
                                onChange={(e) => handleUpdateCondition(cond.id, { value: e.target.value })}
                                placeholder={fieldMeta?.placeholder || selectedOp?.placeholder || 'Value...'}
                                className="w-full px-3 py-1.5 rounded-md border border-border-light bg-white focus:outline-none focus:border-brand-primary text-xs text-text-primary font-medium"
                              />
                            </div>

                            {/* Remove Row Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCondition(cond.id)}
                              title="Remove Condition"
                              className="p-1.5 rounded-md border border-border-light bg-white hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Contextual Field Helper & Smart Suggestion Chips */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center gap-1.5 text-text-muted">
                              <Info className="w-3 h-3 text-brand-primary shrink-0" />
                              <span className="leading-tight">
                                {fieldMeta?.description || 'Evaluates condition criteria against event payload.'}
                                {fieldMeta?.example && (
                                  <span className="text-text-secondary ml-1">
                                    (e.g. <code className="text-brand-primary font-semibold font-mono">{fieldMeta.example}</code>)
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Quick Suggestion Chips */}
                            {fieldMeta?.suggestions && fieldMeta.suggestions.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] font-bold text-text-muted uppercase">Quick Fill:</span>
                                {fieldMeta.suggestions.map((sug) => {
                                  const isActive = cond.value === sug;
                                  return (
                                    <button
                                      type="button"
                                      key={sug}
                                      onClick={() => handleUpdateCondition(cond.id, { value: sug })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                                        isActive
                                          ? 'bg-brand-primary/15 border-brand-primary text-brand-primary font-extrabold shadow-xs'
                                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {sug}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add Condition Button */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddCondition()}
                      className="px-3 py-1.5 rounded-lg border border-dashed border-brand-primary/60 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Condition</span>
                    </button>
                    <span className="text-[10px] text-text-muted">
                      Evaluated when event stream matches criteria
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Custom Notification Message Template & Webhook JSON Payload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border-light">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-primary">
                    <Variable className="w-3.5 h-3.5 text-brand-primary" />
                    <span>4. Custom Notification Message & Payload Template</span>
                  </div>
                  
                  {/* Template Sub-Tabs Switcher */}
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateTab('message');
                        setPreviewTab('message');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        templateTab === 'message'
                          ? 'bg-white text-brand-primary shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Message Body</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateTab('webhook_json');
                        setPreviewTab('webhook_json');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        templateTab === 'webhook_json'
                          ? 'bg-white text-emerald-600 shadow-xs'
                          : formChannels.includes('webhook')
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-extrabold'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Webhook JSON</span>
                      {formChannels.includes('webhook') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Variable insertion chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Insert Variables:</span>
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => handleInsertTemplateVar(v.tag)}
                      title={`Click to insert ${v.tag}`}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      + {v.tag}
                    </button>
                  ))}
                  {templateTab === 'webhook_json' && (
                    <button
                      type="button"
                      onClick={handleResetWebhookJson}
                      className="ml-auto px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Reset to Default JSON
                    </button>
                  )}
                </div>

                {/* Tab 1: Chat Message Body */}
                {templateTab === 'message' && (
                  <div className="space-y-1">
                    <textarea
                      ref={templateTextareaRef}
                      rows={3}
                      value={formTemplate}
                      onChange={(e) => setFormTemplate(e.target.value)}
                      placeholder="Custom alert body template (e.g. 🚨 [{{severity}}] Alert: {{title}} triggered on {{target}} at {{timestamp}})"
                      className="w-full px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:border-brand-primary text-text-primary font-mono text-xs leading-relaxed"
                    />
                    <p className="text-[10px] text-text-muted">
                      Applied to Telegram, WhatsApp, Slack, Discord, and included in the default Webhook <code className="font-mono text-slate-700">message</code> field.
                    </p>
                  </div>
                )}

                {/* Tab 2: Custom Webhook JSON Payload */}
                {templateTab === 'webhook_json' && (
                  <div className="space-y-1">
                    <textarea
                      ref={webhookTextareaRef}
                      rows={6}
                      value={formWebhookJson}
                      onChange={(e) => setFormWebhookJson(e.target.value)}
                      placeholder={`{\n  "event": "gateway_alert",\n  "severity": "{{severity}}",\n  "title": "{{title}}",\n  "message": "{{message}}",\n  "timestamp": "{{timestamp}}"\n}`}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-slate-950 text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono text-xs leading-relaxed"
                    />
                    <p className="text-[10px] text-text-muted flex items-center justify-between">
                      <span>Leave blank to use the standard auto-generated JSON structure.</span>
                      <span className="text-emerald-600 font-bold">Dynamic variables supported</span>
                    </p>
                  </div>
                )}

                {/* Dual Live Preview Box */}
                {(liveInterpolatedPreview || liveWebhookJsonPreview) && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                          Live Message Preview (Real-time Interpolation)
                        </span>
                      </div>
                      
                      {/* Preview Switcher */}
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewTab('message');
                            setTemplateTab('message');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            previewTab === 'message'
                              ? 'bg-brand-primary text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          💬 Message Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewTab('webhook_json');
                            setTemplateTab('webhook_json');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            previewTab === 'webhook_json'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          🌐 Webhook JSON
                        </button>
                      </div>
                    </div>

                    {previewTab === 'message' ? (
                      <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-words leading-relaxed font-semibold max-h-48 overflow-y-auto">
                        {liveInterpolatedPreview || '(Empty message template)'}
                      </pre>
                    ) : (
                      <pre className="text-xs font-mono text-sky-300 whitespace-pre-wrap break-words leading-relaxed font-medium max-h-48 overflow-y-auto">
                        {liveWebhookJsonPreview}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Section 5: Dispatch Channels & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-light">
                {/* Notification Channels Selection */}
                <div className="space-y-2">
                  <label className="font-bold text-text-primary block">
                    5. Dispatch Channels <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['telegram', 'whatsapp', 'slack', 'discord', 'webhook'] as ChannelKey[]).map((ch) => {
                      const info = CHANNEL_ICONS[ch];
                      const selected = formChannels.includes(ch);
                      return (
                        <button
                          type="button"
                          key={ch}
                          onClick={() => toggleChannelSelection(ch)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            selected
                              ? 'border-brand-primary bg-brand-primary/5 text-text-primary font-bold shadow-xs'
                              : 'border-border-light bg-white text-text-secondary hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                              selected
                                ? 'bg-brand-primary border-brand-primary text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {selected && <CheckCircle2 className="w-2.5 h-2.5" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {info.icon}
                            <span className="text-xs">{info.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cooldown Period */}
                <div className="space-y-2">
                  <label className="font-bold text-text-primary block">
                    6. Cooldown Period (Alert Throttle)
                  </label>
                  <select
                    value={formCooldownMins}
                    onChange={(e) => setFormCooldownMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:border-brand-primary text-text-primary cursor-pointer font-medium"
                  >
                    <option value={1}>1 minute (Rapid testing)</option>
                    <option value={5}>5 minutes (Standard)</option>
                    <option value={15}>15 minutes (Quiet)</option>
                    <option value={30}>30 minutes (Periodic)</option>
                    <option value={60}>1 hour (Infrequent)</option>
                    <option value={360}>6 hours (Daily batches)</option>
                    <option value={1440}>24 hours (Once a day)</option>
                  </select>
                  <p className="text-[10px] text-text-muted">
                    Suppresses repetitive notifications for the same trigger condition within this window.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={handleTestModalDispatch}
                  disabled={isTestingModalDispatch}
                  className="px-4 py-2 rounded-lg border border-border-light bg-slate-50 hover:bg-slate-100 text-text-primary font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 text-emerald-600 ${isTestingModalDispatch ? 'animate-pulse' : ''}`} />
                  <span>Test Dispatch Rule</span>
                </button>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border-light bg-white hover:bg-slate-50 text-text-secondary font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-slate-950 font-bold text-xs shadow-md shadow-brand-primary/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {modalLoading ? 'Saving...' : editingRule ? 'Save Changes' : 'Save Alert Rule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

