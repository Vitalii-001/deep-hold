import { useUi } from './uiStore';

export function ConfirmationModal() {
  const confirmation = useUi((u) => u.confirmation);
  const closeConfirmation = useUi((u) => u.closeConfirmation);
  if (!confirmation) return null;

  const confirm = () => {
    confirmation.onConfirm();
    closeConfirmation();
  };

  return (
    <div className="modal-backdrop" onClick={closeConfirmation}>
      <div className="modal confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{confirmation.title}</h2>
        <p className="desc">{confirmation.message}</p>
        <div className="modal-actions">
          <button onClick={closeConfirmation}>Cancel</button>
          <button className={confirmation.danger ? 'reset-btn' : ''} onClick={confirm}>
            {confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
