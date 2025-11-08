// frontend/src/components/ui/Button.jsx

import React from 'react';

const Button = ({ children, type = 'button', variant = 'primary', className, ...props }) => {
  // Define base styles and variants
  const baseStyle = "w-full px-4 py-3 font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary-glow", // Use primary color + glow
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80", // Use secondary color
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    // --- NEW "icon" VARIANT ---
    icon: "w-auto h-auto p-2 text-muted-foreground hover:text-foreground hover:bg-accent",
    // --------------------------
    link: "text-primary underline-offset-4 hover:underline",
  };
  // --------------------------------------------------------------------

  return (
    <button
      type={type}
      // Combine base styles, variant styles, and any additional classes passed via props
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;