import { useState, useRef, useCallback } from 'react';

export default function useHover() {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const onMouseEnter = useCallback(() => setHovered(true), []);
  const onMouseLeave = useCallback(() => setHovered(false), []);
  return [ref, hovered, { onMouseEnter, onMouseLeave }];
}
