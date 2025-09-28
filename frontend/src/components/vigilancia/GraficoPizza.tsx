import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './GraficoPizza.css';

interface PizzaData {
  tipo: string;
  quantidade: number;
}

// ATUALIZADO: Adicionamos a nova propriedade 'onSliceClick'
interface GraficoPizzaProps {
  data: PizzaData[];
  onSliceClick?: (data: any) => void; // Função que será chamada ao clicar em uma fatia
}

// Paleta de cores para as fatias da pizza
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const GraficoPizza: React.FC<GraficoPizzaProps> = ({ data, onSliceClick }) => {
  const processedData = data.map(item => ({
    name: item.tipo, // Recharts usa a chave 'name' para a legenda
    value: Number(item.quantidade), // E 'value' para o valor
  }));

  return (
    <div className="grafico-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* ATUALIZADO: 
            - Adicionamos a propriedade 'onClick' ao gráfico.
            - Adicionamos um cursor de ponteiro para indicar que é clicável.
          */}
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onClick={onSliceClick}
            cursor="pointer"
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: "12px" }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoPizza;