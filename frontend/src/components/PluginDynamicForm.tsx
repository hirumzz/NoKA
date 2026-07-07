import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HelpCircle, AlertCircle, Plus, Trash2, X } from 'lucide-react';

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
  
  const cleanValue = (val: any, meta: any): any => {
    if (meta.type === 'record' && Array.isArray(meta.fields)) {
      if (typeof val !== 'object' || val === null) return undefined;
      const fullyPopulated: any = { ...val };
      let allEmpty = true;
      meta.fields.forEach((subObj: any) => {
        const k = Object.keys(subObj)[0];
        const subMeta = subObj[k];
        let subVal = cleanValue(val[k], subMeta);
        
        if (subVal !== undefined && subVal !== null && subVal !== '' && !(Array.isArray(subVal) && subVal.length === 0) && !(typeof subVal === 'object' && Object.keys(subVal).length === 0)) {
          allEmpty = false;
        }
        
        if (subVal === undefined || subVal === null) {
          if (subMeta.type === 'array' || subMeta.type === 'set') fullyPopulated[k] = [];
          else if (subMeta.type === 'boolean') fullyPopulated[k] = false;
          else if (subMeta.type === 'map') delete fullyPopulated[k];
          else fullyPopulated[k] = '';
        } else {
          fullyPopulated[k] = subVal;
        }
      });
      return allEmpty ? undefined : fullyPopulated;
    }
    
    if (meta.type === 'array' || meta.type === 'set') {
      if (!Array.isArray(val)) return undefined;
      if (meta.elements && meta.elements.type === 'record') {
        const cleanedArr = val.map(v => cleanValue(v, meta.elements)).filter(v => v !== undefined);
        return cleanedArr.length > 0 ? cleanedArr : undefined;
      }
      return val;
    }
    
    if (meta.type === 'map') {
      if (typeof val !== 'object' || val === null || Object.keys(val).length === 0) return undefined;
      return val;
    }
    
    return val;
  };
  
  fields.forEach((fieldObj: any) => {
    const fieldName = Object.keys(fieldObj)[0];
    const fieldMeta = fieldObj[fieldName];
    const val = cleaned[fieldName];
    
    if (val !== undefined) {
      const cleanedVal = cleanValue(val, fieldMeta);
      if (cleanedVal === undefined) {
        delete cleaned[fieldName];
      } else {
        cleaned[fieldName] = cleanedVal;
      }
    }
  });
  
  return cleaned;
};

const MapInput = ({ value, onChange }: { value: any, onChange: (v: any) => void }) => {
  const [entries, setEntries] = useState<[string, string][]>(() => {
    if (value && typeof value === 'object') {
      return Object.entries(value);
    }
    return [];
  });

  const handleChange = (idx: number, key: string, val: string) => {
    const newEntries = [...entries];
    newEntries[idx] = [key, val];
    setEntries(newEntries);
    updateParent(newEntries);
  };

  const handleAdd = () => {
    setEntries([...entries, ['', '']]);
  };

  const handleRemove = (idx: number) => {
    const newEntries = entries.filter((_, i) => i !== idx);
    setEntries(newEntries);
    updateParent(newEntries);
  };

  const updateParent = (currentEntries: [string, string][]) => {
    const obj: any = {};
    let hasData = false;
    currentEntries.forEach(([k, v]) => {
      if (k.trim() !== '') {
        obj[k] = v;
        hasData = true;
      }
    });
    onChange(hasData ? obj : null);
  };

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Key"
            value={entry[0]}
            onChange={(e) => handleChange(idx, e.target.value, entry[1])}
            className="w-1/2 px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
          />
          <input
            type="text"
            placeholder="Value"
            value={entry[1]}
            onChange={(e) => handleChange(idx, entry[0], e.target.value)}
            className="w-1/2 px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary"
          />
          <button type="button" onClick={() => handleRemove(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAdd} className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:text-brand-primary-dark transition-colors px-1 py-0.5 rounded hover:bg-brand-primary/10 w-max">
        <Plus className="w-3 h-3" /> ADD KEY-VALUE
      </button>
    </div>
  );
};

const RecordArrayInput = ({ value, fieldMeta, onChange, renderInputFn }: { value: any, fieldMeta: any, onChange: (v: any) => void, renderInputFn: any }) => {
  const elementsFields = fieldMeta.elements?.fields || [];
  const records = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const newRecord: any = {};
    elementsFields.forEach((f: any) => {
      const k = Object.keys(f)[0];
      newRecord[k] = f[k].default ?? (f[k].type === 'boolean' ? false : (f[k].type === 'array' ? [] : ''));
    });
    onChange([...records, newRecord]);
  };

  const handleRemove = (idx: number) => {
    onChange(records.filter((_: any, i: number) => i !== idx));
  };

  const handleRecordChange = (idx: number, subField: string, val: any) => {
    const newRecords = [...records];
    newRecords[idx] = { ...newRecords[idx], [subField]: val };
    onChange(newRecords);
  };

  return (
    <div className="space-y-4">
      {records.map((record: any, idx: number) => (
        <div key={idx} className="relative p-4 bg-slate-50/50 rounded border border-border-light group space-y-4">
          <button type="button" onClick={() => handleRemove(idx)} className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          {elementsFields.map((subFieldObj: any, sIdx: number) => {
            const subFieldName = Object.keys(subFieldObj)[0];
            const subFieldMeta = subFieldObj[subFieldName];
            const subValue = record[subFieldName];
            
            return (
              <div key={sIdx} className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  {subFieldName.replace(/_/g, ' ')}
                </label>
                {renderInputFn(subFieldName, subFieldMeta, subValue, (f: string, v: any) => handleRecordChange(idx, f, v))}
              </div>
            );
          })}
        </div>
      ))}
      <button type="button" onClick={handleAdd} className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:text-brand-primary-dark transition-colors px-1 py-0.5 rounded hover:bg-brand-primary/10 w-max">
        <Plus className="w-3 h-3" /> ADD ITEM
      </button>
    </div>
  );
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

  // Raw JSON Mode states
  const [isRawMode, setIsRawMode] = useState(false);
  const [isRawMinimized, setIsRawMinimized] = useState(false);
  const [isRawMaximized, setIsRawMaximized] = useState(false);
  const [rawJsonText, setRawJsonText] = useState(JSON.stringify(initialConfig || {}, null, 2));
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    fetchSchema();
    setRawJsonText(JSON.stringify(initialConfig || {}, null, 2));
    setConfigData(initialConfig || {});
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

  const handleRawJsonChange = (text: string) => {
    setRawJsonText(text);
    try {
      if (!text.trim()) {
        setJsonError('');
        onChange({});
        return;
      }
      const parsed = JSON.parse(text);
      setJsonError('');
      onChange(parsed);
    } catch (err: any) {
      setJsonError('Invalid JSON format: ' + err.message);
    }
  };

  const renderInput = (fieldName: string, fieldMeta: any, value: any, onValueChange: (f: string, v: any) => void) => {
    const { type, one_of } = fieldMeta;

    if (one_of && Array.isArray(one_of)) {
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onValueChange(fieldName, e.target.value)}
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
            onClick={() => onValueChange(fieldName, !isChecked)}
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
          onChange={(e) => onValueChange(fieldName, e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
        />
      );
    }

    if (type === 'array' || type === 'set') {
      if (fieldMeta.elements && fieldMeta.elements.type === 'record') {
        return <RecordArrayInput value={value} fieldMeta={fieldMeta} onChange={(v) => onValueChange(fieldName, v)} renderInputFn={renderInput} />;
      }
      
      const arrValue = Array.isArray(value) ? value : [];
      const textValue = arrValue.join(', ');
      
      const isUppercaseField = fieldName === 'methods' || 
        (fieldMeta.elements?.one_of && fieldMeta.elements.one_of.every((x: string) => typeof x === 'string' && x === x.toUpperCase()));

      const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (isUppercaseField) {
          val = val.toUpperCase();
        }
        const parsed = val.split(',').map(s => s.trim()).filter(s => s !== '');
        onValueChange(fieldName, parsed);
      };

      const toggleOption = (opt: string) => {
        let newArr = [...arrValue];
        if (newArr.includes(opt)) {
          newArr = newArr.filter(x => x !== opt);
        } else {
          newArr.push(opt);
        }
        onValueChange(fieldName, newArr);
      };

      const options = fieldMeta.elements?.one_of;

      return (
        <div className="space-y-2">
          {options && Array.isArray(options) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {options.map((opt: string) => {
                const isSelected = arrValue.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                        : 'bg-white border-border-light text-text-secondary hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
          <input
            type="text"
            value={textValue}
            onChange={handleArrayChange}
            placeholder="Comma separated values"
            className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
          />
          {!options && arrValue.length > 0 && (
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

    if (type === 'map') {
      return <MapInput value={value} onChange={(v) => onValueChange(fieldName, v)} />;
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
                      onValueChange(fieldName, { ...recordValue, [f]: v });
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
          onValueChange(fieldName, parsed);
        } catch (err) {
          onValueChange(fieldName, e.target.value);
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

    const isUppercaseStringField = fieldName === 'methods' || 
      (one_of && one_of.every((x: string) => typeof x === 'string' && x === x.toUpperCase()));

    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => {
          let val = e.target.value;
          if (isUppercaseStringField) val = val.toUpperCase();
          onValueChange(fieldName, val);
        }}
        className="w-full px-3 py-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
      />
    );
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
      {/* Mode Selector Toggle */}
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-border-light shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Configuration Mode</span>
          <span className="text-[10px] text-text-muted mt-0.5 font-semibold">Switch between dynamic form builder and raw JSON</span>
        </div>
        <div className="relative flex p-1 bg-slate-200/60 rounded-lg border border-slate-300/50 text-[10px] font-bold uppercase w-64 shadow-inner">
          <div
            className="absolute top-1 bottom-1 left-1 rounded-md bg-white shadow-sm transition-all duration-300 ease-out border border-slate-200"
            style={{
              width: 'calc(50% - 4px)',
              transform: isRawMode ? 'translateX(100%)' : 'translateX(0)'
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (isRawMode) {
                try {
                  const parsed = rawJsonText.trim() ? JSON.parse(rawJsonText) : {};
                  setConfigData(parsed);
                  setIsRawMode(false);
                } catch (err) {
                  alert('Cannot switch mode: JSON is invalid. Please fix the errors first.');
                }
              }
            }}
            className={`relative z-10 flex-1 py-1.5 text-center transition-colors duration-200 ${!isRawMode ? 'text-slate-800 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Dynamic Form
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isRawMode) {
                setRawJsonText(JSON.stringify(configData, null, 2));
                setJsonError('');
                setIsRawMode(true);
              }
            }}
            className={`relative z-10 flex-1 py-1.5 text-center transition-colors duration-200 ${isRawMode ? 'text-slate-800 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Raw JSON
          </button>
        </div>
      </div>

      {isRawMode ? (
        <div className="space-y-3">
          <div className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl transition-all duration-300 ${isRawMaximized ? 'min-h-[500px]' : ''}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800/80 group/lights">
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = rawJsonText.trim() ? JSON.parse(rawJsonText) : {};
                      setConfigData(parsed);
                      setIsRawMode(false);
                    } catch (err) {
                      alert('Cannot switch mode: JSON is invalid. Please fix the errors first.');
                    }
                  }}
                  className="w-3 h-3 rounded-full bg-rose-500/90 flex items-center justify-center text-[8px] text-rose-900/80 font-bold transition-all relative overflow-hidden focus:outline-none"
                  title="Close (Switch to Dynamic Form)"
                >
                  <span className="opacity-0 group-hover/lights:opacity-100 absolute select-none flex items-center justify-center w-full h-full leading-none">
                    <X className="w-[8px] h-[8px] stroke-[4]" />
                  </span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIsRawMinimized(!isRawMinimized)}
                  className="w-3 h-3 rounded-full bg-amber-500/90 flex items-center justify-center text-[8px] text-amber-900/80 font-bold transition-all relative overflow-hidden focus:outline-none"
                  title="Minimize"
                >
                  <span className="opacity-0 group-hover/lights:opacity-100 absolute select-none flex items-center justify-center w-full h-full leading-none text-black">
                    -
                  </span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIsRawMaximized(!isRawMaximized)}
                  className="w-3 h-3 rounded-full bg-emerald-500/90 flex items-center justify-center text-[8px] text-emerald-950 font-bold transition-all relative overflow-hidden focus:outline-none"
                  title="Maximize"
                >
                  <span className="opacity-0 group-hover/lights:opacity-100 absolute select-none flex items-center justify-center w-full h-full leading-none">
                    +
                  </span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest font-semibold uppercase select-none">config.json</span>
              <span className="w-12" /> {/* spacer for center alignment */}
            </div>
            
            <div className={`transition-all duration-300 ease-in-out ${isRawMinimized ? 'h-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
              <textarea
                rows={isRawMaximized ? 30 : 16}
                value={rawJsonText}
                onChange={(e) => handleRawJsonChange(e.target.value)}
                placeholder='{\n  "key": "value"\n}'
                className={`w-full p-5 bg-slate-950 text-emerald-400 text-xs font-mono leading-relaxed outline-none border-0 resize-y custom-scrollbar transition-all duration-300`}
                style={{ minHeight: isRawMaximized ? '500px' : '280px' }}
                spellCheck="false"
              />
            </div>
          </div>
          {jsonError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-[11px] font-bold font-mono animate-slideDown">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {fieldsToRender.map((fieldObj: any, idx: number) => {
            const fieldName = Object.keys(fieldObj)[0];
            const fieldMeta = fieldObj[fieldName];
            const value = configData[fieldName] ?? fieldMeta.default;

            return (
              <div key={idx} className="flex flex-col md:flex-row gap-4 border-b border-border-light pb-4 last:border-0 last:pb-0">
                <div className="md:w-1/3 flex flex-col pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider break-words">
                      {fieldName.replace(/_/g, ' ')}
                    </label>
                    {fieldMeta.description && (
                      <div className="group relative z-10 flex-shrink-0">
                        <HelpCircle className="w-3.5 h-3.5 text-text-muted hover:text-brand-primary cursor-help" />
                        <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg font-normal leading-relaxed">
                          {fieldMeta.description}
                        </div>
                      </div>
                    )}
                  </div>
                  {fieldMeta.required && fieldMeta.type !== 'record' && (
                    <span className="text-[9px] text-red-500 font-bold mt-0.5">* required</span>
                  )}
                </div>
                <div className="md:w-2/3 min-w-0">
                  {renderInput(fieldName, fieldMeta, value, handleFieldChange)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
