import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { UpdateBanner } from './UpdateBanner';

/** Enregistre le service worker et affiche son état ; aucune donnée n'y transite. */
export function PwaUpdates() {
  const [registerError, setRegisterError] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => setRegisterError(true) });

  // « Prêt hors ligne » n'est pas annoncé : un bandeau qui apparaît décalerait la page sous le
  // doigt au premier lancement, et rien en V1 ne dépend de la connexion (§4).
  const status = needRefresh ? 'needRefresh' : registerError ? 'registerError' : null;

  return (
    <UpdateBanner
      status={status}
      onReload={() => void updateServiceWorker(true)}
      onDismiss={() => {
        setNeedRefresh(false);
        setRegisterError(false);
      }}
    />
  );
}
