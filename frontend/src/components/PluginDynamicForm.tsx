import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HelpCircle, AlertCircle } from 'lucide-react';

interface PluginDynamicFormProps {
  pluginName: string;
  initialConfig?: any;
  onChange: (config: any) => void;
}

const cleanPluginConfig = (config: any, schema: any) => {
  if (!config || !schema) return config;
  const cleaned = { ...config };
  const configField = schema.fields?.find((f: any) => f.config);
  const fields = configField?.config?.fields || [];
  
  fields.forEach((fieldObj: any) => {
    const fieldName = Object.keys(fieldObj)[0];
    const fieldMeta = fieldObj[fieldName];
    
    if (fieldMeta.type === 'record' && Array.isArray(fieldMeta.fields)) {
      const recordVal = cleaned[fieldName];
      if (recordVal && typeof recordVal === 'object') {
        let allEmpty = true;
        const subFields = fieldMeta.fields;
        
        subFields.forEach((subFieldObj: any) => {
          const subFieldName = Object.keys(subFieldObj)[0];
          const subFieldMeta = subFieldObj[subFieldName];
          const val = recordVal[subFieldName];
          
          if (subFieldMeta.type === 'array' || subFieldMeta.type === 'set') {
            if (Array.isArray(val) && val.length > 0) {
              allEmpty = false;
            }
          } else if (val !== undefined && val !== null && val !== '') {
            allEmpty = false;
          }
        });
        
        if (allEmpty) {
          delete cleaned[fieldName];
        } else {
          const fullyPopulatedRecord = { ...recordVal };
          subFields.forEach((subFieldObj: any) => {
            const subFieldName = Object.keys(subFieldObj)[0];
            const subFieldMeta = subFieldObj[subFieldName];
            if (fullyPopulatedRecord[subFieldName] === undefined || fullyPopulatedRecord[subFieldName] === null) {
              if (subFieldMeta.type === 'array' || subFieldMeta.type === 'set') {
                fullyPopulatedRecord[subFieldName] = [];
              } else if (subFieldMeta.type === 'boolean') {
                fullyPopulatedRecord[subFieldName] = false;
              } else {
                fullyPopulatedRecord[subFieldName] = '';
              }
            }
          });
          cleaned[fieldName] = fullyPopulatedRecord;
        }
      } else {
        delete cleaned[fieldName];
      }
    }
  });
  
  return cleaned;
};

export const PluginDynamicForm: React.FC<PluginDynamicFormProps> = ({
  pluginName,
  initialConfig = {},
  onChange
}) => {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configData, setConfigData] = useState<any>(initialConfig || {});

  useEffect(() => {
    fetchSchema();
  }, [pluginName]);

  const fetchSchema = async () => {
    if (!pluginName) return;
    setLoading(true);
    setError('');
    try {
      const resp = await axios.get(`/api/kong/schemas/plugins/${pluginName}`);
      setSchema(resp.data);
      
      // Initialize missing default values if initialConfig is empty
      if (Object.keys(initialConfig || {}).length === 0 && resp.data?.fields) {
        const configField = resp.data.fields.find((f: any) => f.config);
        if (configField && configField.config.fields) {
          const defaults: any = {};
          configField.config.fields.forEach((f: any) => {
            const key = Object.keys(f)[0];
            const meta = f[key];
            if (meta.default !== undefined && meta.default !== null) {
              defaults[key] = meta.default;
            } else if (meta.type === 'array' || meta.type === 'set') {
              if (pluginName === 'cors' && ['origins', 'headers', 'exposed_headers'].includes(key)) {
                defaults[key] = ['*'];
              } else {
                defaults[key] = [];
              }
            } else if (meta.type === 'boolean') {
              defaults[key] = false;
            }
          });
          setConfigData(defaults);
          onChange(defaults);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load plugin schema');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    const newConfig = { ...configData, [field]: value };
    setConfigData(newConfig);
    const cleaned = cleanPluginConfig(newConfig, schema);
    onChange(cleaned);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-xs font-semibold text-text-muted bg-slate-50 rounded border border-border-light">
        <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mr-2" />
        Loading schema for {pluginName}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  // Extract config fields
  const configField = schema?.fields?.find((f: any) => f.config);
  const fieldsToRender = configField?.config?.fields || [];

  if (fieldsToRender.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-text-muted bg-slate-50 border border-border-light rounded">
        This plugin has no configurable properties.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fieldsToRender.map((fieldObj: any, idx: number) => {
        const fieldName = Object.keys(fieldObj)[0];
        const fieldMeta = fieldObj[fieldName];
        const value = configData[fieldName] ?? fieldMeta.default;

        return (
          <div key={idx} className="flex flex-col md:flex-row gap-4 border-b border-border-light pb-4 last:border-0 last:pb-0">
            <div className="md:w-1/3 flex flex-col pt-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider">
                  {fieldName.replace(/_/g, ' ')}
                </label>
                {fieldMeta.description && (
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-text-muted hover:text-brand-primary cursor-help" />
                    <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-10 font-normal leading-relaxed">
                      {fieldMeta.description}
                    </div>
                  </div>
                )}
              </div>
              {fieldMeta.required && fieldMeta.type !== 'record' && (
                <span className="text-[9px] text-red-500 font-bold mt-0.5">* required</span>
              )}
            </div>
            <div className="md:w-2/3">
              {renderInput(fieldName, fieldMeta, value, handleFieldChange)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const renderInput = (fieldName: string, fieldMeta: any, value: any, onChange: (f: string, v: any) => void) => {
  const { type, one_of } = fieldMeta;

  if (one_of && Array.isArray(one_of)) {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(fieldName, e.target.value)}
        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-semibold text-text-primary"
      >
        <option value="" disabled>Select an option</option>
        {one_of.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (type === 'boolean') {
    const isChecked = !!value;
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          onClick={() => onChange(fieldName, !isChecked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isChecked ? 'bg-brand-primary' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isChecked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-[10px] font-bold uppercase ${isChecked ? 'text-brand-primary' : 'text-text-muted'}`}>
          {isChecked ? 'YES' : 'NO'}
        </span>
      </div>
    );
  }

  if (type === 'integer' || type === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(fieldName, e.target.value === '' ? null : Number(e.target.value))}
        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
      />
    );
  }

  if (type === 'array' || type === 'set') {
    const arrValue = Array.isArray(value) ? value : [];
    const textValue = arrValue.join(', ');
    
    const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const parsed = val.split(',').map(s => s.trim()).filter(s => s !== '');
      onChange(fieldName, parsed);
    };

    return (
      <div className="space-y-2">
        <input
          type="text"
          value={textValue}
          onChange={handleArrayChange}
          placeholder="Comma separated values"
          className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
        />
        {arrValue.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {arrValue.map((item: string, i: number) => (
              <span key={i} className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold border border-brand-primary/20">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'record') {
    if (Array.isArray(fieldMeta.fields)) {
      const recordValue = typeof value === 'object' && value !== null ? value : {};
      return (
        <div className="space-y-4 p-4 bg-slate-50/50 rounded border border-border-light">
          {fieldMeta.fields.map((subFieldObj: any, idx: number) => {
            const subFieldName = Object.keys(subFieldObj)[0];
            const subFieldMeta = subFieldObj[subFieldName];
            const subValue = recordValue[subFieldName] ?? subFieldMeta.default;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">
                    {subFieldName.replace(/_/g, ' ')}
                  </label>
                  {subFieldMeta.description && (
                    <div className="group relative">
                      <HelpCircle className="w-3 h-3 text-text-muted hover:text-brand-primary cursor-help" />
                      <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-1.5 bg-slate-800 text-white text-[9px] rounded shadow-lg z-10 font-normal leading-relaxed">
                        {subFieldMeta.description}
                      </div>
                    </div>
                  )}
                </div>
                {renderInput(
                  subFieldName,
                  subFieldMeta,
                  subValue,
                  (f, v) => {
                    onChange(fieldName, { ...recordValue, [f]: v });
                  }
                )}
              </div>
            );
          })}
        </div>
      );
    }

    const textValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const parsed = JSON.parse(e.target.value);
        onChange(fieldName, parsed);
      } catch (err) {
        // Just store the string if it's invalid JSON
        onChange(fieldName, e.target.value);
      }
    };
    return (
      <textarea
        rows={4}
        value={textValue || ''}
        onChange={handleJsonChange}
        placeholder="{}"
        className="w-full p-2.5 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-mono leading-normal"
      />
    );
  }

  // Default fallback (string)
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(fieldName, e.target.value)}
      className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
    />
  );
};
