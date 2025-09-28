// src/components/Header.tsx
import React from "react";

// imports das logos
import prefeituraLogo from "../assets/logos/prefeitura.png";
import creasLogo from "../assets/logos/creas.png";
import paefiLogo from "../assets/logos/paefi.png";
import programaLogo from "../assets/logos/programa.png";
import suasLogo from "../assets/logos/suas.png";

type HeaderProps = {
  showNames?: boolean; // opção: mostrar nomes abaixo das logos
  title?: string; // título do sistema (pode mudar em cada CRAS/CREAS/PAEFI)
};

const logos = [
  { src: prefeituraLogo, alt: "Prefeitura Municipal" },
  { src: creasLogo, alt: "CREAS" },
  { src: paefiLogo, alt: "PAEFI" },
  { src: programaLogo, alt: "Programa Social" },
  { src: suasLogo, alt: "SUAS" },
];

export default function Header({
  showNames = false,
  title = "Vigilância Socioassistencial",
}: HeaderProps) {
  return (
    <header className="bg-white border-b shadow-sm">
      {/* 🔹 Parte superior com logos */}
      <div className="flex flex-wrap justify-center gap-6 p-4">
        {logos.map((logo, i) => (
          <div key={i} className="flex flex-col items-center">
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-12 object-contain"
              loading="lazy"
            />
            {showNames && (
              <span className="text-xs text-gray-600 mt-1">{logo.alt}</span>
            )}
          </div>
        ))}
      </div>

      {/* 🔹 Linha inferior com título */}
      <div className="bg-gray-50 text-center p-2">
        <h1 className="text-lg font-semibold text-gray-700">{title}</h1>
      </div>
    </header>
  );
}

