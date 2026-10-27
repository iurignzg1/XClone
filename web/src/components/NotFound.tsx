import { Link } from 'react-router';
import shared from '../styles/shared.module.css';

export function NotFound() {
  return (
    <section className={`${shared.padded} ${shared.centered}`}>
      <h2>Página não encontrada</h2>
      <p className={shared.muted}>
        Esse endereço não existe. <Link to="/home">Voltar para a home</Link>
      </p>
    </section>
  );
}
