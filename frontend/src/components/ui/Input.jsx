// frontend/src/components/ui/Input.jsx

import React from 'react';

const Input = ({ label, id, type = 'text', className, ...props }) => {
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={id} className="mb-2 text-sm font-medium text-muted-foreground"> {/* Use muted text for label */}
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        // Apply dark theme styles using CSS variable colors
        className={`form-input w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
