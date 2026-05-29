interface CanvasLoaderProps {
  label?: string;
}

/**
 * Lightweight, non-blocking loading overlay for 3D canvas islands. Rendered
 * inside a `position: relative` stage and faded out by the parent (via an
 * `is-ready` class) once the WebGL context is created, so lazily hydrated
 * scenes never show as empty whitespace on scroll.
 */
export default function CanvasLoader({ label }: CanvasLoaderProps): React.JSX.Element {
  return (
    <div className="canvas-loader" aria-hidden="true">
      <span className="canvas-loader__spinner" />
      {label ? <span className="canvas-loader__label">{label}</span> : null}
    </div>
  );
}
