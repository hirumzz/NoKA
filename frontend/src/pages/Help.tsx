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
          Learn about each menu in Noka, how to configure routing and plugins, and troubleshooting steps. Click on Services or Routes for full tutorials.
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
