import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DragScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function DragScroll({ children, className }: DragScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
    ref.current.style.cursor = "grabbing";
    ref.current.style.userSelect = "none";
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (!ref.current) return;
    ref.current.style.cursor = "grab";
    ref.current.style.userSelect = "";
  }, []);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
    if (!ref.current) return;
    ref.current.style.cursor = "grab";
    ref.current.style.userSelect = "";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    ref.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  return (
    <div
      ref={ref}
      className={cn("overflow-x-auto no-scrollbar", className)}
      style={{ cursor: "grab", WebkitOverflowScrolling: "touch" }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {children}
    </div>
  );
}
