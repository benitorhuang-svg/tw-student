import React from 'react';

interface MiniMapTitleProps {
  label: string;
}

/**
 * Atom: MiniMapTitle
 * Displays the current hovered county name or fallback title.
 */
export const MiniMapTitle: React.FC<MiniMapTitleProps> = ({ label }) => {
  return (
    <div className="atlas-mini-map-card__header">
      <span className="atlas-mini-map-card__title">
        {label}
      </span>
    </div>
  );
};
