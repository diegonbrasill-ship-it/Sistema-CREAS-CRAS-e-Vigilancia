//
// Arquivo: /src/components/Vigilancia/CardKPI.tsx (ATUALIZADO PARA TYPESCRIPT)
//
import React from 'react';
import './CardKPI.css'; // O CSS continua o mesmo

// 1. Definimos o "contrato" das propriedades (props) que este componente aceita.
interface CardKPIProps {
  title: string;
  subtitle: string;
  value: number | string; // O valor pode ser um número (82) ou um texto ("12%")
  status?: 'alerta' | 'ok'; // O status é opcional ('?') e só pode ser 'alerta' ou 'ok'
}

// 2. Usamos React.FC (Functional Component) e passamos nosso contrato de props.
const CardKPI: React.FC<CardKPIProps> = ({ title, value, subtitle, status }) => {
  const statusClassName = status ? `kpi-card--${status}` : '';

  return (
    <div className={`kpi-card ${statusClassName}`}>
      <h3 className="kpi-card__title">{title}</h3>
      <p className="kpi-card__subtitle">{subtitle}</p>
      <div className="kpi-card__value-wrapper">
        <span className="kpi-card__value">{value}</span>
      </div>
      {status && (
        <p className="kpi-card__status">
          {status === 'alerta' ? `(Alerta: Acima do limite)` : `(Status: ${status})`}
        </p>
      )}
    </div>
  );
};

export default CardKPI;