"use client";
import { useState } from "react";

interface Integracao {
  nome: string;
  descricao: string;
  status: "Ativa" | "Em desenvolvimento" | "Futura";
}

export default function Integracoes() {
  const [municipio, setMunicipio] = useState("");
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Consulta API IBGE
  const consultarMunicipio = async () => {
    if (!municipio) {
      setErro("Digite o nome de um município.");
      return;
    }

    setErro("");
    setLoading(true);
    setDados(null);

    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${municipio.toLowerCase()}`
      );

      if (!response.ok) {
        throw new Error("Não encontrado");
      }

      const data = await response.json();

      if (data.length === 0) {
        throw new Error("Município não encontrado");
      }

      setDados(data[0]); // pega o primeiro resultado
    } catch (e) {
      setErro("Erro ao consultar a API do IBGE. Verifique o nome do município.");
    } finally {
      setLoading(false);
    }
  };

  // Dados das integrações
  const prioritarias: Integracao[] = [
    { nome: "CadÚnico", descricao: "Consulta famílias em situação de vulnerabilidade.", status: "Em desenvolvimento" },
    { nome: "Sistema de Justiça", descricao: "Encaminhamentos e medidas protetivas.", status: "Em desenvolvimento" },
    { nome: "CRAS", descricao: "Histórico de atendimentos no território.", status: "Em desenvolvimento" },
    { nome: "IBGE", descricao: "Consulta informações oficiais do município.", status: "Ativa" },
  ];

  const intermediarias: Integracao[] = [
    { nome: "Saúde", descricao: "Encaminhamentos e atendimentos de saúde.", status: "Futura" },
    { nome: "Educação", descricao: "Acompanhamento escolar de crianças em situação de risco.", status: "Futura" },
  ];

  const estrategicas: Integracao[] = [
    { nome: "Trabalho e Emprego", descricao: "Inclusão produtiva e geração de renda.", status: "Futura" },
    { nome: "Habitação", descricao: "Situação habitacional e programas de moradia.", status: "Futura" },
  ];

  // Componente de status com cor
  const StatusBadge = ({ status }: { status: Integracao["status"] }) => {
    const cores: Record<Integracao["status"], string> = {
      Ativa: "bg-green-100 text-green-700",
      "Em desenvolvimento": "bg-yellow-100 text-yellow-700",
      Futura: "bg-gray-100 text-gray-700",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cores[status]}`}>{status}</span>;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-8">
      <h2 className="text-2xl font-bold">🔗 Integrações</h2>
      <p className="text-gray-700">
        Esta seção reúne integrações estratégicas com bases externas para apoiar o trabalho da Vigilância Socioassistencial.
      </p>

      {/* Prioritárias */}
      <section>
        <h3 className="text-lg font-semibold mb-4">🚀 Prioritárias</h3>
        <div className="space-y-4">
          {prioritarias.map((int) => (
            <div key={int.nome} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">{int.nome}</h4>
                <StatusBadge status={int.status} />
              </div>
              <p className="text-sm text-gray-600">{int.descricao}</p>

              {/* IBGE ativo com consulta */}
              {int.nome === "IBGE" && (
                <div className="mt-4">
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Ex: Patos"
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 flex-1"
                    />
                    <button
                      onClick={consultarMunicipio}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Consultar
                    </button>
                  </div>
                  {loading && <p className="text-gray-500">Consultando...</p>}
                  {erro && <p className="text-red-600">{erro}</p>}
                  {dados && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">📍 Município Encontrado</h4>
                      <p><strong>Nome:</strong> {dados.nome}</p>
                      <p><strong>UF:</strong> {dados.microrregiao.mesorregiao.UF.nome}</p>
                      <p><strong>Região:</strong> {dados.microrregiao.mesorregiao.UF.regiao.nome}</p>
                      <p><strong>ID IBGE:</strong> {dados.id}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Intermediárias */}
      <section>
        <h3 className="text-lg font-semibold mb-4">⚡ Intermediárias</h3>
        <div className="space-y-4">
          {intermediarias.map((int) => (
            <div key={int.nome} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">{int.nome}</h4>
                <StatusBadge status={int.status} />
              </div>
              <p className="text-sm text-gray-600">{int.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Estratégicas */}
      <section>
        <h3 className="text-lg font-semibold mb-4">🌐 Estratégicas</h3>
        <div className="space-y-4">
          {estrategicas.map((int) => (
            <div key={int.nome} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">{int.nome}</h4>
                <StatusBadge status={int.status} />
              </div>
              <p className="text-sm text-gray-600">{int.descricao}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}




