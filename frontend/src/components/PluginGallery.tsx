import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PluginDynamicForm } from './PluginDynamicForm';

const PLUGIN_GROUPS = [
  {
    name: "Authentication",
    description: "Protect your services with an authentication layer",
    plugins: {
      "basic-auth": { description: "Add Basic Authentication to your APIs" },
      "key-auth": { description: "Add a key authentication to your APIs" },
      "oauth2": { description: "Add an OAuth 2.0 authentication to your APIs" },
      "hmac-auth": { description: "Add HMAC Authentication to your APIs" },
      "jwt": { description: "Verify and authenticate JSON Web Tokens" },
      "ldap-auth": { description: "Integrate Kong with a LDAP server" },
      "session": { description: "Support sessions for Kong Authentication Plugins." }
    }
  },
  {
    name: "Security",
    description: "Protect your services with additional security layers",
    plugins: {
      "acl": { description: "Control which consumers can access APIs" },
      "cors": { description: "Allow developers to make requests from the browser" },
      "ip-restriction": { description: "Whitelist or blacklist IPs that can make requests" },
      "bot-detection": { description: "Detects and blocks bots or custom clients" },
      "acme": { description: "Let's Encrypt and ACMEv2 integration with Kong" }
    }
  },
  {
    name: "Traffic Control",
    description: "Manage, throttle and restrict inbound and outbound API traffic",
    plugins: {
      "rate-limiting": { description: "Rate-limit how many HTTP requests a developer can make" },
      "response-ratelimiting": { description: "Rate-Limiting based on a custom response header value" },
      "request-size-limiting": { description: "Block requests with bodies greater than a specific size" },
      "request-termination": { description: "This plugin terminates incoming requests with a specified status code and message. This allows to (temporarily) block an API or Consumer." },
      "proxy-cache": { description: "Cache and serve commonly requested responses in Kong" },
      "grpc-gateway": { description: "Expose gRPC services as REST APIs" },
      "grpc-web": { description: "Allow browser clients to access gRPC services via gRPC-Web protocol" }
    }
  },
  {
    name: "Serverless",
    description: "Invoke serverless functions in combination with other plugins:",
    plugins: {
      "aws-lambda": { description: "Invoke an AWS Lambda function from Kong. It can be used in combination with other request plugins to secure, manage or extend the function." },
      "pre-function": { description: "Dynamically run Lua code from Kong during access phase." },
      "post-function": { description: "Dynamically run Lua code from Kong during access phase." },
      "azure-functions": { description: "This plugin invokes Azure Functions. It can be used in combination with other request plugins to secure, manage or extend the function" }
    }
  },
  {
    name: "Analytics & Monitoring",
    description: "Visualize, inspect and monitor APIs and microservices traffic",
    plugins: {
      "datadog": { description: "Visualize API metrics on Datadog" },
      "prometheus": { description: "Expose metrics related to Kong and proxied upstream services in Prometheus exposition format" },
      "zipkin": { description: "Propagate Zipkin distributed tracing spans, and report spans to a Zipkin server." },
      "opentelemetry": { description: "Propagate OpenTelemetry tracing spans and report metrics." }
    }
  },
  {
    name: "Transformations",
    description: "Transform request and responses on the fly on Kong",
    plugins: {
      "request-transformer": { description: "Modify the request before hitting the upstream server" },
      "response-transformer": { description: "Modify the upstream response before returning it to the client" },
      "correlation-id": { description: "Correlate requests and responses using a unique ID" },
    }
  },
  {
    name: "Logging",
    description: "Log requests and response data using the best transport for your infrastructure",
    plugins: {
      "tcp-log": { description: "Send request and response logs to a TCP server" },
      "udp-log": { description: "Send request and response logs to an UDP server" },
      "http-log": { description: "Send request and response logs to an HTTP server" },
      "file-log": { description: "Append request and response data to a log file on disk" },
      "syslog": { description: "Send request and response logs to Syslog" },
      "statsd": { description: "Send request and response logs to StatsD" },
      "loggly": { description: "Send request and response logs to Loggly" }
    }
  }
];

interface PluginGalleryProps {
  onAdd: (pluginName: string, config: any, tags: string[]) => void;
  onCancel: () => void;
  scopeContext?: string; // e.g. "Global", "Service", "Route"
}

export const PluginGallery: React.FC<PluginGalleryProps> = ({ onAdd, onCancel, scopeContext = "Globally" }) => {
  const [activeTab, setActiveTab] = useState(PLUGIN_GROUPS[0].name);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  
  const [pluginConfig, setPluginConfig] = useState<any>({});
  const [tagsInput, setTagsInput] = useState('');
  const [isFormInvalid, setIsFormInvalid] = useState(false);

  const activeGroup = PLUGIN_GROUPS.find(g => g.name === activeTab);

  if (selectedPlugin) {
    return (
      <div className="bg-white p-6 rounded-xl space-y-4 flex flex-col max-h-[88vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b border-border-light pb-4 shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded overflow-hidden flex items-center justify-center bg-white border border-border-light shadow-sm shrink-0">
                <img 
                  src={`/images/kong/plugins/${selectedPlugin}.png`} 
                  alt={selectedPlugin}
                  onError={(e) => {
                    e.currentTarget.src = '/images/kong/plugins/kong.svg';
                  }}
                  className="max-w-full max-h-full object-contain p-1"
                />
             </div>
             <div>
               <h3 className="text-lg font-bold text-text-primary capitalize">{selectedPlugin.replace(/-/g, ' ')}</h3>
               <p className="text-xs text-text-secondary">Configure this plugin</p>
             </div>
          </div>
          <button onClick={() => setSelectedPlugin(null)} className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-border-light rounded-lg p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
          <PluginDynamicForm
            pluginName={selectedPlugin}
            initialConfig={{}}
            onChange={(cfg) => setPluginConfig(cfg)}
            onValidationError={setIsFormInvalid}
          />
        </div>

        <div className="space-y-1 shrink-0">
          <label className="text-[10px] font-bold text-text-secondary uppercase">Tags (comma-separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. production, auth, public"
            className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
          />
        </div>

        <div className="flex gap-2 justify-end pt-4 shrink-0 border-t border-border-light">
          <button
            type="button"
            onClick={() => setSelectedPlugin(null)}
            className="px-4 py-2 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (isFormInvalid) return;
              const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
              onAdd(selectedPlugin, pluginConfig, parsedTags);
            }}
            disabled={isFormInvalid}
            className={`px-4 py-2 rounded text-white font-bold text-xs uppercase transition-colors ${
              isFormInvalid ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#87b926] hover:bg-[#729c1e]'
            }`}
          >
            Add Plugin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white flex flex-col h-full overflow-hidden">
      {/* Alert Banner */}
      <div className="bg-[#b4e6d4] text-[#1c644d] p-4 text-xs relative flex justify-between items-start shrink-0">
        <div>
          <p className="font-bold">Plugins added in this section will be applied {scopeContext}.</p>
          <p>- If you need to add plugins to a specific Service or Route, you can do it in the respective section.</p>
          <p>- If you need to add plugins to a specific Consumer, you can do it in the respective Consumer's page.</p>
        </div>
        <button onClick={onCancel} className="text-[#1c644d] hover:opacity-70 mt-0.5"><X className="w-4 h-4"/></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-light pt-4 px-4 overflow-x-auto custom-scrollbar shrink-0">
        {PLUGIN_GROUPS.map((group) => (
          <button
            key={group.name}
            onClick={() => setActiveTab(group.name)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === group.name 
                ? 'border-[#87b926] bg-[#87b926] text-white rounded-t-md' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      <div className="p-6 bg-slate-50/50 overflow-y-auto max-h-[calc(88vh-140px)] custom-scrollbar flex-1">
        <div className="mb-6 flex items-center gap-2">
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            {activeGroup?.name}
          </h3>
        </div>
        <p className="text-xs text-text-secondary -mt-4 mb-6">{activeGroup?.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeGroup && Object.entries(activeGroup.plugins).map(([pluginName, details]) => (
            <div key={pluginName} className="bg-white border border-border-light rounded shadow-sm hover:shadow-md transition-shadow flex flex-col items-center p-6 h-full text-center group">
              <h4 className="font-bold text-sm text-text-primary capitalize mb-6 group-hover:text-brand-primary transition-colors">{pluginName.replace(/-/g, ' ')}</h4>
              <div className="w-16 h-16 flex items-center justify-center mb-6">
                 <img 
                    src={`/images/kong/plugins/${pluginName}.png`} 
                    alt={pluginName}
                    onError={(e) => {
                      e.currentTarget.src = '/images/kong/plugins/kong.svg';
                    }}
                    className="max-w-full max-h-full object-contain"
                  />
              </div>
              <p className="text-[11px] text-text-secondary mb-6 flex-1">
                {(details as any).description}
              </p>
              <button 
                onClick={() => setSelectedPlugin(pluginName)}
                className="w-full py-2 bg-[#87b926] hover:bg-[#729c1e] text-white font-bold text-xs uppercase rounded transition-colors mt-auto shadow-sm"
              >
                Add Plugin
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
