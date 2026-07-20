import { Toasts } from '../Toasts';
import { OfflineModal } from '../OfflineModal';
import { CreditsModal } from '../CreditsModal';
import { SettingsModal } from '../SettingsModal';
import { ConfirmationModal } from '../ConfirmationModal';
import { DiscoveryModal } from '../modals/DiscoveryModal';
import { KingsHallModal } from '../modals/KingsHallModal';
import { AdOverlay } from '../AdOverlay';

export function ModalLayer() {
  return (
    <>
      <Toasts />
      <OfflineModal />
      <CreditsModal />
      <SettingsModal />
      <ConfirmationModal />
      <DiscoveryModal />
      <KingsHallModal />
      <AdOverlay />
    </>
  );
}
