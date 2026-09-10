import { useState } from 'react';
import {
  HelpCircle,
  LayoutDashboard,
  Cloud,
  Split,
  Users,
  Plug,
  Server,
  Lock,
  AlertTriangle,
  Rocket,
  ChevronDown,
  ChevronUp,
  BellRing,
  Send,
  ShieldCheck,
  Zap,
  Activity,
  Clock,
} from 'lucide-react';

const Help = () => {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const toggleGuide = (guide: string) => {
    setActiveGuide(activeGuide === guide ? null : guide);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-2">
          <HelpCircle className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-800">NOKA Documentation & Help Center</h1>
        </div>
        <p className="text-slate-500">
          Learn about each menu in Noka, how to configure routing and plugins, set up alerts and 3rd-party integrations, and troubleshooting steps. Click on Services, Routes, or Alerts for full tutorials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 border-b-2 border-emerald-500 inline-block pb-2 mb-2">
            Gateway Navigation & Menu Guide
          </h2>

          <div className="space-y-3">
            <div className="bg-white rounded border-l-4 border-emerald-500 p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <LayoutDashboard className="w-5 h-5 mr-2 text-emerald-500" /> Dashboard
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Displays real-time status of your active Kong connection (Postgres health, configuration synchronicity, node details) along with visual charts tracking requests/second, top-hit endpoints, and slowest paths.
              </p>
            </div>

            <div 
              className="bg-white rounded border-l-4 border-blue-500 p-4 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleGuide('services')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <Cloud className="w-5 h-5 mr-2 text-blue-500" /> Services
                </h3>
                <span className="text-xs text-blue-500 font-medium flex items-center">
                  {activeGuide === 'services' ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  Click for Full Tutorial
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Allows you to manage upstream APIs or microservices. A service object represents your backend API, defining the upstream URL, protocol, and connection timeouts where Kong will forward matched requests.
              </p>
            </div>

            {activeGuide === 'services' && (
              <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="text-lg font-bold text-blue-700 flex items-center mb-4">
                  <Cloud className="w-6 h-6 mr-2" /> Services — Full Tutorial
                </h4>
                
                <h5 className="font-bold text-blue-700 mb-2">What is a Service?</h5>
                <p className="text-sm text-slate-600 mb-6">
                  A Service in Kong represents your actual backend application or microservice. It tells Kong where to forward incoming requests that match associated Routes. Think of it as a pointer to your upstream API.
                </p>

                <h5 className="font-bold text-blue-700 mb-2">Step-by-Step: Creating a Service</h5>
                <div className="bg-white rounded border border-slate-200 p-4 mb-6">
                  <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
                    <li>Go to <strong>Services</strong> in the left sidebar menu.</li>
                    <li>Click the <strong>"+ Add New Service"</strong> button (top-right).</li>
                    <li>Fill in the <strong>Name</strong> — a friendly identifier (e.g. <code>user-service</code>).</li>
                    <li>Set the <strong>Protocol</strong> — usually <code>http</code> or <code>https</code>.</li>
                    <li>Set the <strong>Host</strong> — this is the hostname of your backend. In Docker, use the container name (e.g. <code>my-backend-app</code>).</li>
                    <li>Set the <strong>Port</strong> — the port your backend listens on (e.g. <code>3000</code>, <code>8080</code>).</li>
                    <li>Optionally set <strong>Path</strong> — a base path that gets prepended to the request path (e.g. <code>/v1</code>).</li>
                    <li>Click <strong>Save changes</strong>.</li>
                  </ol>
                </div>

                <h5 className="font-bold text-blue-700 mb-2">Field Explanation</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs uppercase bg-blue-100 text-blue-800">
                      <tr>
                        <th className="px-4 py-3 rounded-tl">Field</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 rounded-tr">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white border-b">
                        <td className="px-4 py-3 font-semibold">Name</td>
                        <td className="px-4 py-3">Optional identifier for the Service</td>
                        <td className="px-4 py-3"><code>user-api</code></td>
                      </tr>
                      <tr className="bg-white border-b">
                        <td className="px-4 py-3 font-semibold">Protocol</td>
                        <td className="px-4 py-3">Protocol to communicate with upstream</td>
                        <td className="px-4 py-3"><code>http</code> or <code>https</code></td>
                      </tr>
                      <tr className="bg-white border-b">
                        <td className="px-4 py-3 font-semibold">Host</td>
                        <td className="px-4 py-3">Domain or IP of upstream service</td>
                        <td className="px-4 py-3"><code>192.168.1.100</code></td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-4 py-3 font-semibold rounded-bl">Port</td>
                        <td className="px-4 py-3">Port the upstream is listening on</td>
                        <td className="px-4 py-3 rounded-br"><code>8080</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div 
              className="bg-white rounded border-l-4 border-orange-500 p-4 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleGuide('routes')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <Split className="w-5 h-5 mr-2 text-orange-500" /> Routes
                </h3>
                <span className="text-xs text-orange-500 font-medium flex items-center">
                  {activeGuide === 'routes' ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  Click for Full Tutorial
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Defines how incoming client requests map to your services. A Route matches criteria (like path prefixes, methods, or headers) and forwards the request to its parent service.
              </p>
            </div>

            {activeGuide === 'routes' && (
              <div className="bg-orange-50/50 rounded-lg border border-orange-100 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="text-lg font-bold text-orange-700 flex items-center mb-4">
                  <Split className="w-6 h-6 mr-2" /> Routes — Full Tutorial
                </h4>
                
                <h5 className="font-bold text-orange-700 mb-2">What is a Route?</h5>
                <p className="text-sm text-slate-600 mb-6">
                  A Route defines the rules to match client requests. Once matched, the request is routed to the Service attached to this Route. You can match by Paths, Hosts, Methods, or Headers.
                </p>

                <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                  <h5 className="font-bold text-red-600 mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" /> CRITICAL REQUIREMENT
                  </h5>
                  <p className="text-sm text-slate-600">
                    The most common mistake when creating Routes: After typing a path like <code>/my-api</code> in the Paths input field, you <strong>MUST press the Enter key</strong> on your keyboard to confirm the value. The path appears as a tag/chip when confirmed.
                  </p>
                </div>

                <h5 className="font-bold text-orange-700 mb-2">Understanding Strip Path</h5>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs uppercase bg-orange-100 text-orange-800">
                      <tr>
                        <th className="px-4 py-3 rounded-tl">Client Request</th>
                        <th className="px-4 py-3">Route Path</th>
                        <th className="px-4 py-3">Strip Path</th>
                        <th className="px-4 py-3 rounded-tr">Upstream Receives</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white border-b">
                        <td className="px-4 py-3"><code>GET /api/users/123</code></td>
                        <td className="px-4 py-3"><code>/api</code></td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">ON</td>
                        <td className="px-4 py-3 font-mono text-xs"><code>GET /users/123</code></td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-4 py-3 rounded-bl"><code>GET /api/users/123</code></td>
                        <td className="px-4 py-3"><code>/api</code></td>
                        <td className="px-4 py-3 text-red-600 font-bold">OFF</td>
                        <td className="px-4 py-3 font-mono text-xs rounded-br"><code>GET /api/users/123</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h5 className="font-bold text-orange-700 mb-2">Understanding Preserve Host</h5>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs uppercase bg-orange-100 text-orange-800">
                      <tr>
                        <th className="px-4 py-3 rounded-tl">Client Request Header</th>
                        <th className="px-4 py-3">Preserve Host</th>
                        <th className="px-4 py-3 rounded-tr">Upstream Receives Host Header</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white border-b">
                        <td className="px-4 py-3"><code>Host: my-app.com</code></td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">ON</td>
                        <td className="px-4 py-3 font-mono text-xs"><code>Host: my-app.com</code> <span className="text-slate-400">(same as client)</span></td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-4 py-3 rounded-bl"><code>Host: my-app.com</code></td>
                        <td className="px-4 py-3 text-red-600 font-bold">OFF</td>
                        <td className="px-4 py-3 font-mono text-xs rounded-br"><code>Host: backend-service.internal</code> <span className="text-slate-400">(Kong's upstream host)</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-500 mt-2 italic">
                    💡 <strong>When to use Preserve Host ON?</strong> When your backend needs the original hostname from the client (e.g., virtual hosting, or backends that validate the Host header). When OFF, Kong replaces the Host header with its own upstream hostname.
                  </p>
                </div>
                <h5 className="font-bold text-orange-700 mb-2">Example: Route for a user microservice</h5>
                <div className="bg-slate-800 rounded p-4 text-slate-300 font-mono text-xs space-y-1">
                  <div><span className="text-orange-300">Name:</span> users-route</div>
                  <div><span className="text-orange-300">Paths:</span> /api/users <span className="text-slate-500">(remember to press Enter!)</span></div>
                  <div><span className="text-orange-300">Methods:</span> GET, POST</div>
                  <div><span className="text-orange-300">Strip Path:</span> ON</div>
                  <div className="pt-2 text-emerald-400">→ Client calls: GET http://kong:8000/api/users/123</div>
                  <div className="text-blue-300">→ Backend receives: GET http://user-service:3000/123</div>
                </div>
              </div>
            )}

            <div className="bg-white rounded border-l-4 border-emerald-500 p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Users className="w-5 h-5 mr-2 text-emerald-500" /> Consumers
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Represents a client or consumer of your API. Used to attach authentication credentials (like API keys, JWT, Basic Auth) and apply granular rate limiting or Access Control List (ACL) grouping rules per client.
              </p>
            </div>

            <div className="bg-white rounded border-l-4 border-emerald-500 p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Plug className="w-5 h-5 mr-2 text-emerald-500" /> Plugins
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Middleware modules that run during request execution. Plugins handle cross-cutting concerns like security, traffic throttling, log forwarding, and header transforms. They can be applied globally, or scoped to specific services/routes.
              </p>
            </div>

            <div className="bg-white rounded border-l-4 border-emerald-500 p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Server className="w-5 h-5 mr-2 text-emerald-500" /> Upstreams
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Virtual hostnames used for load balancing. Add multiple targets (IP:port) behind an upstream to distribute traffic. Kong handles health checks and failover automatically.
              </p>
            </div>

            <div className="bg-white rounded border-l-4 border-emerald-500 p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-emerald-500" /> Vaults & Keys
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Configure backend vault adapters (like HashiCorp Vault, AWS Secrets Manager) to securely store system secrets. Keys and Key Sets manage cryptographic identities (like JWK, public keys) used for token verification.
              </p>
            </div>

            {/* ALERTS & 3RD-PARTY INTEGRATIONS SECTION */}
            <div 
              className="bg-white rounded border-l-4 border-purple-500 p-4 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleGuide('alerts')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <BellRing className="w-5 h-5 mr-2 text-purple-500" /> Alerts & 3rd-Party Integrations
                </h3>
                <span className="text-xs text-purple-500 font-medium flex items-center">
                  {activeGuide === 'alerts' ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  Click for Full Tutorial
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Real-time incident response and multi-channel alerting. Automate monitoring for gateway reachability, 5xx error spikes, SSL certificate expiration, and critical config mutations across Telegram, WhatsApp, Slack, Discord, and Webhooks.
              </p>
            </div>

            {activeGuide === 'alerts' && (
              <div className="bg-purple-50/50 rounded-lg border border-purple-100 p-6 animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-purple-800 flex items-center mb-2">
                    <BellRing className="w-6 h-6 mr-2 text-purple-600" /> Alerts & 3rd-Party Integrations — Master Guide
                  </h4>
                  <p className="text-sm text-slate-600">
                    NOKA includes a composable multi-channel alerting engine. Configure universal rule criteria, interpolate dynamic payload variables, set cooldown periods to prevent alert fatigue, and securely dispatch notifications to third-party endpoints.
                  </p>
                </div>

                {/* 1. 3rd-Party Integrations Setup */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                  <h5 className="font-bold text-slate-800 flex items-center text-sm">
                    <Send className="w-4 h-4 mr-2 text-purple-600" /> 1. Configuring 3rd-Party Integration Channels
                  </h5>
                  <p className="text-xs text-slate-500">
                    Manage your delivery credentials under <strong className="text-slate-700">Application &gt; Settings &gt; Integrations</strong> or the 3rd-Party tab in the Alerts console.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Telegram */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2">
                      <div className="font-bold text-slate-800 flex items-center text-xs">
                        <span className="w-2 h-2 rounded-full bg-sky-500 mr-2"></span> Telegram Bot Setup
                      </div>
                      <ol className="list-decimal list-inside text-slate-600 space-y-1.5 leading-relaxed">
                        <li>Open Telegram and message <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">@BotFather</code>.</li>
                        <li>Send <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">/newbot</code> and follow prompts to obtain your <strong>Bot API Token</strong> (e.g. <code>123456789:ABCdefGhIJKlm...</code>).</li>
                        <li>Start a conversation with your bot, or add it to your DevOps group.</li>
                        <li>Retrieve your <strong>Chat ID</strong>: Message <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">@userinfobot</code> or fetch updates via <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>. (Group IDs begin with a minus, e.g. <code>-100123456789</code>).</li>
                        <li><em>Optional:</em> For supergroups with Forum Topics, specify the <strong>Topic / Thread ID</strong> to isolate alerts into specific topic threads.</li>
                      </ol>
                    </div>

                    {/* WhatsApp */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2">
                      <div className="font-bold text-slate-800 flex items-center text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> WhatsApp (via WAHA Gateway)
                      </div>
                      <ol className="list-decimal list-inside text-slate-600 space-y-1.5 leading-relaxed">
                        <li>Deploy the <a href="https://waha.devlike.pro/" target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold underline">WAHA (WhatsApp HTTP API)</a> Docker container in your infrastructure.</li>
                        <li>Enter the <strong>Server URL</strong> (e.g. <code>http://waha:3000</code> or <code>https://waha.internal.net</code>).</li>
                        <li>Provide your <strong>API Key</strong> (if configured on the WAHA daemon) and <strong>Session Name</strong> (defaults to <code>default</code>).</li>
                        <li>Configure the <strong>Recipient Phone</strong> in international E.164 format with country code (e.g. <code>6281234567890@c.us</code> or group ID <code>123456789@g.us</code>).</li>
                      </ol>
                    </div>

                    {/* Slack */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2">
                      <div className="font-bold text-slate-800 flex items-center text-xs">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-500 mr-2"></span> Slack Webhooks
                      </div>
                      <ol className="list-decimal list-inside text-slate-600 space-y-1.5 leading-relaxed">
                        <li>Go to your Slack Workspace App Management and enable <strong>Incoming Webhooks</strong>.</li>
                        <li>Click <strong>Add New Webhook to Workspace</strong> and choose target channel.</li>
                        <li>Copy the generated <strong>Webhook URL</strong> (e.g. <code>https://hooks.slack.com/services/T.../B.../...</code>).</li>
                        <li><em>Optional:</em> Override the default channel (e.g. <code>#gateway-alerts</code>) or customize the sender Bot Username.</li>
                      </ol>
                    </div>

                    {/* Discord & Generic Webhooks */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs space-y-2">
                      <div className="font-bold text-slate-800 flex items-center text-xs">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span> Discord &amp; Custom Webhooks
                      </div>
                      <ul className="list-disc list-inside text-slate-600 space-y-1.5 leading-relaxed">
                        <li><strong>Discord:</strong> In your Discord channel, go to <em>Server Settings &gt; Integrations &gt; Webhooks &gt; New Webhook</em> and paste the Webhook URL into NOKA.</li>
                        <li><strong>Generic Webhooks:</strong> Enter any HTTP endpoint URL (e.g. PagerDuty, Opsgenie, custom REST receivers). Supports <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">POST</code> or <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">PUT</code> with custom header mappings (e.g. <code>Authorization: Bearer &lt;token&gt;</code>).</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2. Security & AES-256 GCM */}
                <div className="bg-purple-950 text-purple-100 rounded-lg p-5 shadow-sm space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Security &amp; AES-256 GCM Encryption at Rest</span>
                  </div>
                  <p className="text-xs text-purple-200 leading-relaxed">
                    All sensitive secrets — including Telegram bot tokens, WAHA API keys, Slack/Discord webhook URLs, and custom authentication headers — are protected using <strong>AES-256 GCM authenticated encryption at rest</strong> before being persisted into the PostgreSQL database (<code className="text-amber-300 font-mono">konga_settings</code>). 
                    Secrets are decrypted strictly in memory upon dispatch, ensuring zero plaintext leakage in database backups, replication streams, or query logs.
                  </p>
                </div>

                {/* 3. Universal Composable Alert Rules */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                  <h5 className="font-bold text-slate-800 flex items-center text-sm">
                    <Zap className="w-4 h-4 mr-2 text-purple-600" /> 2. Universal Composable Alert Rules
                  </h5>
                  <p className="text-xs text-slate-600">
                    Rules allow you to define granular event matching conditions, choose notification channels, and customize outgoing alert messages.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-600 border border-slate-200 rounded">
                      <thead className="text-[11px] uppercase bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="px-3 py-2 border-b">Event Source</th>
                          <th className="px-3 py-2 border-b">Trigger Description</th>
                          <th className="px-3 py-2 border-b">Available Payload Variables</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-white">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">reachability_ping</td>
                          <td className="px-3 py-2">Fired when Kong Admin API health check ping fails or returns HTTP 5xx.</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;target&#125;&#125;</code>, <code>&#123;&#123;status_code&#125;&#125;</code>, <code>&#123;&#123;node_name&#125;&#125;</code></td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">gateway_node</td>
                          <td className="px-3 py-2">Gateway node goes offline, unreachable, or is disconnected.</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;node_name&#125;&#125;</code>, <code>&#123;&#123;admin_url&#125;&#125;</code>, <code>&#123;&#123;status_code&#125;&#125;</code></td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">plugin_registry</td>
                          <td className="px-3 py-2">Security anomaly detected (e.g. dynamic Lua execution plugins <code>pre-function</code> / <code>post-function</code>).</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;plugin_name&#125;&#125;</code>, <code>&#123;&#123;plugin_id&#125;&#125;</code>, <code>&#123;&#123;node_name&#125;&#125;</code></td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">metrics</td>
                          <td className="px-3 py-2">Prometheus HTTP 5xx error rate or traffic spike crosses configured threshold.</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;target&#125;&#125;</code>, <code>&#123;&#123;error_rate&#125;&#125;</code>, <code>&#123;&#123;status_code&#125;&#125;</code></td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">audit_mutation</td>
                          <td className="px-3 py-2">Mutating configuration actions (Service/Route deletion, credential changes).</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;actor&#125;&#125;</code>, <code>&#123;&#123;target&#125;&#125;</code>, <code>&#123;&#123;action&#125;&#125;</code>, <code>&#123;&#123;entity&#125;&#125;</code></td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">ssl_cert</td>
                          <td className="px-3 py-2">SSL/TLS certificate expiring within 30 days (&lt;= 7 days triggers CRITICAL).</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;target&#125;&#125;</code> (SNIs), <code>&#123;&#123;days_remaining&#125;&#125;</code>, <code>&#123;&#123;expires_at&#125;&#125;</code></td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-3 py-2 font-mono font-semibold text-purple-700">custom</td>
                          <td className="px-3 py-2">Catch-all custom events and ad-hoc rule evaluation.</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500"><code>&#123;&#123;title&#125;&#125;</code>, <code>&#123;&#123;message&#125;&#125;</code>, <code>&#123;&#123;timestamp&#125;&#125;</code>, <code>&#123;&#123;details&#125;&#125;</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Condition Operators & Logic */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1.5">
                      <div className="font-bold text-slate-800">Supported Condition Operators</div>
                      <ul className="text-slate-600 space-y-1 list-disc list-inside">
                        <li><code>equals</code> / <code>not_equals</code>: Exact match</li>
                        <li><code>greater_than</code> / <code>less_than</code>: Numeric comparison</li>
                        <li><code>greater_equal</code> / <code>less_equal</code>: Numeric threshold</li>
                        <li><code>contains</code> / <code>not_contains</code>: Substring search</li>
                        <li><code>in_list</code>: Comma-separated list membership (e.g. <code>500,502,503,504</code>)</li>
                        <li><code>regex_match</code>: Regular expression pattern</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1.5">
                      <div className="font-bold text-slate-800">Matching Logic (MatchLogic)</div>
                      <ul className="text-slate-600 space-y-1 list-disc list-inside">
                        <li><strong>ALL (AND):</strong> Every condition rule item must match for the alert to trigger.</li>
                        <li><strong>ANY (OR):</strong> Alert triggers if at least one condition item evaluates to true.</li>
                      </ul>
                      <div className="pt-2 font-bold text-slate-800">Variable Interpolation Example</div>
                      <div className="bg-slate-900 text-purple-300 font-mono text-[11px] p-2 rounded">
                        🚨 Target &#123;&#123;target&#125;&#125; failed with status &#123;&#123;status_code&#125;&#125; by user &#123;&#123;actor&#125;&#125; at &#123;&#123;timestamp&#125;&#125;
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Cooldown Periods & Automated Scanning */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs space-y-2">
                    <div className="font-bold text-amber-800 flex items-center">
                      <Clock className="w-4 h-4 mr-1.5 text-amber-600" /> Cooldown Periods (Anti-Fatigue)
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      To prevent inbox flooding and alert fatigue during cascading failures, each rule has a configurable <strong>Cooldown Period</strong> (e.g., 5, 15, 30, or 60 minutes). Subsequent matching events within the cooldown window are suppressed from sending duplicate messages to chat channels.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs space-y-2">
                    <div className="font-bold text-blue-800 flex items-center">
                      <Activity className="w-4 h-4 mr-1.5 text-blue-600" /> Automated Incident Detection
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      NOKA's background engine continuously probes active Kong nodes every <strong>60 seconds</strong>. It automatically triggers incidents on reachability 5xx responses, detects unapproved Lua code injection plugins, and scans SSL certificates approaching expiration.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-red-50 rounded-lg border-l-4 border-red-500 p-5">
            <h4 className="font-bold text-red-700 flex items-center mb-3">
              <AlertTriangle className="w-5 h-5 mr-2" /> Common Mistakes
            </h4>
            <ul className="text-sm text-slate-700 space-y-3 list-disc list-outside ml-4">
              <li>
                <strong className="text-red-600">Forgetting to press Enter on path input</strong> — After typing a path like <code>/my-api</code>, you MUST press <kbd className="bg-slate-200 px-1 rounded text-xs">Enter</kbd> to confirm it.
              </li>
              <li>
                <strong className="text-red-600">No routing rule defined</strong> — A Route requires at least one matching criteria (path, host, method, or header).
              </li>
              <li>
                <strong className="text-red-600">Wrong Service host</strong> — The host must be resolvable from Kong's network. Use container names in Docker (e.g. <code>my-backend</code>), not <code>localhost</code>.
              </li>
              <li>
                <strong className="text-red-600">Path without leading slash</strong> — Paths must start with <code>/</code>. Writing <code>api/v1</code> instead of <code>/api/v1</code> will fail.
              </li>
              <li>
                <strong className="text-red-600">Forgetting to select a Kong connection</strong> — Before managing anything, ensure you have selected an active Kong node in the Connections menu.
              </li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
            <h4 className="font-bold text-slate-800 flex items-center mb-3">
              <Rocket className="w-5 h-5 mr-2 text-emerald-500" /> Quick Start (3 Steps)
            </h4>
            <ol className="text-sm text-slate-600 space-y-3 list-decimal list-inside">
              <li>
                <strong>Create a Service</strong> — Point it to your backend (e.g. <code>http://my-api:3000</code>).
              </li>
              <li>
                <strong>Add a Route</strong> — Define a path like <code>/my-api</code> and press <kbd className="bg-slate-200 px-1 rounded text-xs font-sans">Enter</kbd>.
              </li>
              <li>
                <strong>Test it</strong> — Call <code>http://kong-host:8000/my-api</code> and see your traffic forwarded.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Help };
