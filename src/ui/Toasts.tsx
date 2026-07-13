import { useEffect } from 'react';
import { useUi } from './uiStore';

function ToastItem({ id, text }: { id: number; text: string }) {
  const removeToast = useUi((u) => u.removeToast);
  useEffect(() => {
    const h = setTimeout(() => removeToast(id), 5000);
    return () => clearTimeout(h);
  }, [id, removeToast]);
  return <div className="toast">{text}</div>;
}

export function Toasts() {
  const toasts = useUi((u) => u.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} text={t.text} />
      ))}
    </div>
  );
}
