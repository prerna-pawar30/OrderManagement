import { useEffect, useLayoutEffect, useRef, useState } from "react";

const GUTTER = 8;

// Shared open/close + positioning for the portaled "..." / pill menus.
// Keeps the popover fully on screen: clamped horizontally (on a phone the
// trigger can sit near the left edge, so right-aligning would push the menu
// off-screen), and flipped above the trigger when there's no room below.
export default function usePopover(minWidth) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: minWidth });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updateCoords = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(minWidth, rect.width), vw - GUTTER * 2);
    const menuHeight = menuRef.current?.offsetHeight || 0;

    // Prefer aligning to the trigger's right edge, then clamp into the viewport.
    let left = rect.right - width;
    if (left < GUTTER) left = rect.left;
    left = Math.max(GUTTER, Math.min(left, vw - width - GUTTER));

    let top = rect.bottom + GUTTER;
    if (top + menuHeight > vh - GUTTER && rect.top - GUTTER - menuHeight > GUTTER) {
      top = rect.top - GUTTER - menuHeight;
    }
    setCoords({ top, left, width });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (buttonRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const reposition = () => updateCoords();
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { open, setOpen, coords, buttonRef, menuRef };
}
