import React from 'react';

/**
 * IconBox - Softly tinted, rounded-square container for icons.
 * Matches the icon's primary stroke color with a pale background.
 * Variants: blue, teal, red, amber, green, gray
 */
const IconBox = ({ children, variant = 'blue', size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'icon-box-sm' : size === 'lg' ? 'icon-box-lg' : '';
  return (
    <div className={`icon-box icon-box-${variant} ${sizeClass} ${className}`.trim()}>
      {children}
    </div>
  );
};

export default IconBox;
