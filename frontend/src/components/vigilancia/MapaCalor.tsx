import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import './MapaCalor.css';

// ATUALIZADO: Adicionamos a nova propriedade 'onMarkerClick'
interface MapaCalorProps {
  data: Array<{
    bairro: string;
    casos: number;
  }>;
  onMarkerClick?: (bairro: string) => void; // Função que será chamada ao clicar em um marcador
}

const coordenadasBairros: { [key: string]: [number, number] } = {
    'Centro': [-7.0285, -37.2799],
    'Belo Horizonte': [-7.0224, -37.2885],
    'Liberdade': [-7.0363, -37.2825],
    'Jatobá': [-7.0451, -37.2910],
    'São Sebastião': [-7.0315, -37.2701],
};

const getColor = (casos: number) => {
    if (casos > 50) return '#d53e4f';
    if (casos > 30) return '#f46d43';
    if (casos > 15) return '#fdae61';
    if (casos > 5) return '#fee08b';
    return '#abdda4';
};

const MapaCalor: React.FC<MapaCalorProps> = ({ data, onMarkerClick }) => {
  const centroMapa: [number, number] = [-7.025, -37.280];

  if (!Array.isArray(data)) {
    console.error("Componente MapaCalor recebeu 'data' que não é um array:", data);
    return (
      <div className="mapa-container mapa-error">
        <p>Não foi possível carregar os dados de incidência territorial.</p>
      </div>
    );
  }

  return (
    <div className="mapa-container">
      <MapContainer center={centroMapa} zoom={14} scrollWheelZoom={false} className="mapa">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.map(item => {
          const position = coordenadasBairros[item.bairro];
          if (position) {
            return (
              <CircleMarker
                key={item.bairro}
                center={position}
                radius={5 + Math.sqrt(item.casos) * 2}
                pathOptions={{
                  color: getColor(item.casos),
                  fillColor: getColor(item.casos),
                  fillOpacity: 0.7,
                  weight: 1,
                }}
                // ATUALIZADO: Adicionamos o manipulador de eventos de clique
                eventHandlers={{
                  click: () => {
                    if (onMarkerClick) {
                      onMarkerClick(item.bairro);
                    }
                  },
                }}
              >
                <Popup>
                  <b>{item.bairro}</b><br />
                  {item.casos} caso(s) registrado(s).
                </Popup>
              </CircleMarker>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
};

export default MapaCalor;