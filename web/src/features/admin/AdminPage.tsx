import { Link } from 'react-router';
import shared from '../../styles/shared.module.css';

// Área só para ADMIN (a rota é protegida por papel). Por enquanto é só a casca:
// a suspensão de contas acontece no perfil de cada usuário.
export function AdminPage() {
  return (
    <section>
      <header className={shared.pageTitle}>
        <Link to="/home" aria-label="Voltar para a home">←</Link>
        <h2>Administração</h2>
      </header>
      <p className={`${shared.muted} ${shared.padded}`}>
        Para suspender uma conta, abra o perfil do usuário e use o botão "Suspender conta".
      </p>
    </section>
  );
}
