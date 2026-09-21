// Conecta o chat de um projeto assim que o hook monta e desconecta ao
// desmontar — usado por components/ChatProjeto.tsx dentro de detalhes-projeto.tsx.
import { useEffect, useRef, useState } from 'react';
import { criarClienteChat, listarHistoricoDoChat, type MensagemProjeto } from '../services/chatService';
import { ApiError } from '../services/apiClient';

export function useChatProjeto(projetoId: string, habilitado: boolean) {
  const [mensagens, setMensagens] = useState<MensagemProjeto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const clienteRef = useRef<ReturnType<typeof criarClienteChat> | null>(null);

  useEffect(() => {
    if (!habilitado) return;

    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o loading ao trocar de projeto/habilitar, antes do fetch abaixo
    setCarregando(true);
    setErro(null);

    listarHistoricoDoChat(projetoId)
      .then((historico) => {
        if (cancelado) return;
        setMensagens(historico);

        const cliente = criarClienteChat(projetoId, (mensagem) => {
          setMensagens((atuais) => [...atuais, mensagem]);
        });
        clienteRef.current = cliente;
        cliente.ativar();
      })
      .catch((erroCapturado) => {
        if (cancelado) return;
        setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível carregar o chat.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
      clienteRef.current?.desativar();
      clienteRef.current = null;
    };
  }, [projetoId, habilitado]);

  function enviar(conteudo: string) {
    clienteRef.current?.enviar(conteudo);
  }

  return { mensagens, carregando, erro, enviar };
}
