import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { searchCasosByTerm, getUsers, createDemanda } from '@/services/api';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

// Tipos
interface User { id: number; username: string; role: string; }
interface CasoSearchResult { id: number; nome: string; tecRef: string; }
interface DemandaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Para avisar a página-pai que um novo item foi criado
}

const TIPO_DOCUMENTO = ["Ofício", "Memorando", "Encaminhamento", "Requisição Judicial", "Outro"];

export default function DemandaFormModal({ isOpen, onClose, onSuccess }: DemandaFormModalProps) {
  // Estados do formulário
  const [formData, setFormData] = useState({
    tipo_documento: '',
    instituicao_origem: '',
    numero_documento: '',
    data_recebimento: new Date().toISOString().split('T')[0], // Hoje como padrão
    prazo_resposta: '',
    assunto: '',
    caso_associado_id: null as number | null,
    tecnico_designado_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Estados para a busca inteligente
  const [casoSearchTerm, setCasoSearchTerm] = useState('');
  const [casoSearchResults, setCasoSearchResults] = useState<CasoSearchResult[]>([]);
  const [selectedCaso, setSelectedCaso] = useState<CasoSearchResult | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const { user: currentUser } = useAuth();

  // Busca a lista de todos os usuários (para o menu de técnicos) uma vez
  useEffect(() => {
    if (isOpen) {
      getUsers()
        .then(users => setAllUsers(users))
        .catch(() => toast.error("Falha ao carregar lista de técnicos."));
    }
  }, [isOpen]);

  // Efeito para a busca de casos com debounce (espera o usuário parar de digitar)
  useEffect(() => {
    if (casoSearchTerm.length < 3) {
      setCasoSearchResults([]);
      return;
    }
    const timerId = setTimeout(() => {
      searchCasosByTerm(casoSearchTerm).then(setCasoSearchResults);
    }, 500);
    return () => clearTimeout(timerId);
  }, [casoSearchTerm]);

  // Efeito da "Designação Inteligente"
  useEffect(() => {
    if (selectedCaso) {
      // Encontra o usuário correspondente ao tecRef do caso selecionado
      const tecnicoDoCaso = allUsers.find(u => u.username === selectedCaso.tecRef);
      if (tecnicoDoCaso) {
        setFormData(prev => ({ ...prev, tecnico_designado_id: String(tecnicoDoCaso.id) }));
      }
    }
  }, [selectedCaso, allUsers]);

  const handleSelectCaso = (caso: CasoSearchResult) => {
    setSelectedCaso(caso);
    setFormData(prev => ({ ...prev, caso_associado_id: caso.id }));
    setCasoSearchTerm(caso.nome); // Preenche o campo de busca com o nome
    setCasoSearchResults([]); // Esconde a lista de resultados
  };
  
  const clearCasoSelection = () => {
    setSelectedCaso(null);
    setFormData(prev => ({ ...prev, caso_associado_id: null, tecnico_designado_id: '' }));
    setCasoSearchTerm('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await createDemanda(formData);
      toast.success("Nova demanda registrada com sucesso!");
      onSuccess(); // Chama a função de sucesso para atualizar a lista na página-pai
      onClose(); // Fecha o modal
    } catch (error: any) {
      toast.error(`Erro ao salvar demanda: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Nova Demanda</DialogTitle>
          <DialogDescription>
            Preencha as informações do documento recebido para criar e delegar a demanda.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          {/* Dados do Documento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instituicao_origem">Instituição de Origem</Label>
              <Input id="instituicao_origem" name="instituicao_origem" value={formData.instituicao_origem} onChange={handleChange} placeholder="Ex: Conselho Tutelar, Ministério Público..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_documento">Tipo de Documento</Label>
              <Select name="tipo_documento" onValueChange={(value) => handleSelectChange('tipo_documento', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                <SelectContent>
                  {TIPO_DOCUMENTO.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_documento">Nº do Documento (Opcional)</Label>
              <Input id="numero_documento" name="numero_documento" value={formData.numero_documento} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_recebimento">Data de Recebimento</Label>
              <Input id="data_recebimento" name="data_recebimento" type="date" value={formData.data_recebimento} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo_resposta">Prazo de Resposta (Opcional)</Label>
              <Input id="prazo_resposta" name="prazo_resposta" type="date" value={formData.prazo_resposta} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto / Resumo</Label>
            <Textarea id="assunto" name="assunto" value={formData.assunto} onChange={handleChange} placeholder="Descreva brevemente a solicitação do documento." />
          </div>

          {/* Associação e Designação */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-md font-semibold">Associação e Designação</h3>
            <div className='relative'>
              <Label htmlFor="caso_search">Associar a um Caso (buscar por Nome ou NIS)</Label>
              <Input 
                id="caso_search" 
                placeholder="Digite para buscar um usuário..."
                value={casoSearchTerm}
                onChange={(e) => { setCasoSearchTerm(e.target.value); setSelectedCaso(null); }}
                disabled={!!selectedCaso}
              />
              {selectedCaso && (
                <Button variant="ghost" size="sm" className="absolute right-1 top-6" onClick={clearCasoSelection}>Limpar</Button>
              )}
              {casoSearchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
                  {casoSearchResults.map(caso => (
                    <div key={caso.id} className="p-2 hover:bg-slate-100 cursor-pointer" onClick={() => handleSelectCaso(caso)}>
                      <p className="font-semibold">{caso.nome}</p>
                      <p className="text-xs text-slate-500">Técnico: {caso.tecRef}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tecnico_designado_id">Designar para o Técnico</Label>
              <Select 
                name="tecnico_designado_id" 
                value={formData.tecnico_designado_id} 
                onValueChange={(value) => handleSelectChange('tecnico_designado_id', value)}
                // Desabilitado se um caso já foi selecionado (designação automática)
                disabled={!!selectedCaso}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCaso ? "Designado automaticamente" : "Selecione um técnico..."} />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.filter(u => u.role === 'tecnico' || u.role === 'coordenador').map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>{user.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCaso && <p className="text-xs text-slate-500">O técnico foi selecionado automaticamente com base no caso associado.</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Demanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}