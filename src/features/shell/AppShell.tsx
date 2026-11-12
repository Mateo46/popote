/**
 * Coquille des écrans connectés : garde d'authentification + barre d'onglets.
 *
 * Tant que la session n'est pas restaurée (quelques millisecondes au lancement), on
 * n'affiche rien plutôt que de faire clignoter l'écran de connexion.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../data/auth';
import { TabBar } from '../../ui/TabBar';

export function AppShell() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}
