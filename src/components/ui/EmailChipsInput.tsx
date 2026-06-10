import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface EmailChipsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmailChipsInput({ value, onChange, placeholder, disabled }: EmailChipsInputProps) {
  const [inputValue, setInputValue] = useState('');
  
  // Parse semicolon-separated string to array
  const emails = (value || '').split(';').map(e => e.trim()).filter(Boolean);

  const addEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    
    // Minimal email validation to prevent complete junk
    if (!cleanEmail.includes('@') && !cleanEmail.includes('.')) return;
    
    if (!emails.includes(cleanEmail)) {
      onChange([...emails, cleanEmail].join(';'));
    }
    setInputValue('');
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter(e => e !== emailToRemove).join(';'));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ';' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      // Remove last item on backspace if input is empty
      e.preventDefault();
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputValue) {
      addEmail(inputValue);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 p-2 min-h-[42px] border rounded-lg bg-white transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : 'border-slate-200'}`}>
      {emails.map(email => (
        <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 text-[13px] bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-100">
          {email}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="text-blue-400 hover:text-blue-700 focus:outline-none"
            >
              <X size={14} />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={emails.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[150px] bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400"
      />
    </div>
  );
}
