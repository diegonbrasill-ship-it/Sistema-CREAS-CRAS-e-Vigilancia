import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './GraficoBarras.css';

// ⭐️ CORREÇÃO: Padronizando para a estrutura universal {name, value}
interface GraficoData {
  name: string;
  value: number;
}

// ATUALIZADO: Adicionamos a nova propriedade 'onBarClick'
interface GraficoBarrasProps {
  data: GraficoData[];
  onBarClick?: (data: any) => void; // Função que será chamada ao clicar em uma barra
}

const GraficoBarras: React.FC<GraficoBarrasProps> = ({ data, onBarClick }) => {
  // Apenas garante que o value é numérico
  const processedData = data.map(item => ({
    ...item,
    value: Number(item.value), // Usa 'value' em vez de 'quantidade'
  }));

  return (
    <div className="grafico-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={processedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          {/* ⭐️ CORREÇÃO: Usar 'name' como dataKey para o eixo Y */}
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} /> 
          <Tooltip />
          <Legend />
          {/* ⭐️ CORREÇÃO: Usar 'value' como dataKey para a barra */}
          <Bar 
            dataKey="value" 
            fill="#8884d8" 
            name="Nº de Casos" 
            onClick={onBarClick}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoBarras;