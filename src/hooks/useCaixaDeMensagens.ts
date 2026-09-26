// Estado da página "Mensagens": lista de conversas (com prévia e não lidas),
// a conversa aberta e uma única conexão STOMP inscrita em todos os projetos
// do usuário, para atualizar prévias e contadores em tempo real.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';
import {
  criarClienteMensagens,
  listarConversas,
  listarHistoricoDoChat,
  marcarConversaComoLida,
  notificarMensagensAtualizadas,
  type ClienteMensagens,
  type Conversa,
  type MensagemProjeto,
} from '../services/chatService';

function mensagemDeErro(erro: unknown, padrao: string): string {
  return erro instanceof ApiError ? erro.message : padrao;
}

export function useCaixaDeMensagens(projetoAbertoId: string | null, meuId: string | null) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [erroConversas, setErroConversas] = useState<string | null>(null);

  const [mensagens, setMensagens] = useState<MensagemProjeto[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [erroMensagens, setErroMensagens] = useState<string | null>(null);

  const [conectado, setConectado] = useState(false);
  const clienteRef = useRef<ClienteMensagens | null>(null);

  // O callback do STOMP é criado uma vez por conexão — lê os valores atuais por ref.
  const abertoRef = useRef(projetoAbertoId);
  const meuIdRef = useRef(meuId);
  useEffect(() => { abertoRef.current = projetoAbertoId; }, [projetoAbertoId]);
  useEffect(() => { meuIdRef.current = meuId; }, [meuId]);

  const marcarLida = useCallback((projetoId: string) => {
    marcarConversaComoLida(projetoId)
      .then(notificarMensagensAtualizadas)
      .catch(() => {});
  }, []);

  useEffect(() => {
    listarConversas()
      .then(setConversas)
      .catch((erro) => setErroConversas(mensagemDeErro(erro, 'Não foi possível carregar suas conversas.')))
      .finally(() => setCarregandoConversas(false));
  }, []);

  // Reinscreve só quando o conjunto de projetos muda, não a cada prévia nova.
  const chaveProjetos = conversas.map((c) => c.projeto.id).sort().join(',');

  useEffect(() => {
    if (!chaveProjetos) return;

    const cliente = criarClienteMensagens(
      chaveProjetos.split(','),
      (mensagem) => {
        const aberta = mensagem.projetoId === abertoRef.current;
        const minha = mensagem.autor?.id === meuIdRef.current;

        setConversas((atuais) => {
          const alvo = atuais.find((c) => c.projeto.id === mensagem.projetoId);
          if (!alvo) return atuais;
          const atualizada: Conversa = {
            ...alvo,
            ultimaMensagem: mensagem,
            naoLidas: aberta || minha ? alvo.naoLidas : alvo.naoLidas + 1,
          };
          return [atualizada, ...atuais.filter((c) => c !== alvo)];
        });

        if (aberta) {
          setMensagens((atuais) => (atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem]));
          if (!minha) marcarLida(mensagem.projetoId);
        } else if (!minha) {
          notificarMensagensAtualizadas();
        }
      },
      setConectado,
    );
    clienteRef.current = cliente;
    cliente.ativar();

    return () => {
      cliente.desativar();
      clienteRef.current = null;
      setConectado(false);
    };
  }, [chaveProjetos, marcarLida]);

  useEffect(() => {
    if (!projetoAbertoId) return;

    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta a conversa ao trocar de projeto, antes do fetch abaixo
    setCarregandoMensagens(true);
    setErroMensagens(null);
    setMensagens([]);

    listarHistoricoDoChat(projetoAbertoId)
      .then((historico) => {
        if (cancelado) return;
        setMensagens(historico);
        setConversas((atuais) => atuais.map((c) => (c.projeto.id === projetoAbertoId ? { ...c, naoLidas: 0 } : c)));
        marcarLida(projetoAbertoId);
      })
      .catch((erro) => {
        if (!cancelado) setErroMensagens(mensagemDeErro(erro, 'Não foi possível carregar esta conversa.'));
      })
      .finally(() => {
        if (!cancelado) setCarregandoMensagens(false);
      });

    return () => { cancelado = true; };
  }, [projetoAbertoId, marcarLida]);

  // true se foi enviada; false sem conexão (o chamador mantém o rascunho).
  const enviar = useCallback((conteudo: string): boolean => {
    const projetoId = abertoRef.current;
    if (!projetoId || !clienteRef.current) return false;
    try {
      clienteRef.current.enviar(projetoId, conteudo);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    conversas,
    carregandoConversas,
    erroConversas,
    mensagens,
    carregandoMensagens,
    erroMensagens,
    conectado,
    enviar,
  };
}
