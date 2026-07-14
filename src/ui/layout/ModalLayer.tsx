import { Toasts } from '../Toasts';
import { OfflineModal } from '../OfflineModal';
import { CreditsModal } from '../CreditsModal';

export function ModalLayer() {
  return (
    <>
      <Toasts />
      <OfflineModal />
      <CreditsModal />
    </>
  );
}
