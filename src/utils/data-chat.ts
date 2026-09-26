// Formatação de datas do chat, no fuso local do navegador.

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ontem(agora: Date): Date {
  const d = new Date(agora);
  d.setDate(d.getDate() - 1);
  return d;
}

export function formatarHorario(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data));
}

// Separador entre dias na conversa: "Hoje", "Ontem", "12 de setembro" (com ano se for outro ano).
export function rotuloDoDia(data: string, agora: Date = new Date()): string {
  const d = new Date(data);
  if (mesmoDia(d, agora)) return 'Hoje';
  if (mesmoDia(d, ontem(agora))) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== agora.getFullYear() ? { year: 'numeric' } : {}),
  }).format(d);
}

// Horário curto da lista de conversas: "14:02", "Ontem", "seg.", "12/09".
export function formatarQuandoCurto(data: string, agora: Date = new Date()): string {
  const d = new Date(data);
  if (mesmoDia(d, agora)) return formatarHorario(data);
  if (mesmoDia(d, ontem(agora))) return 'Ontem';
  const dias = (agora.getTime() - d.getTime()) / 86_400_000;
  if (dias < 7) return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
}

export function chaveDoDia(data: string): string {
  const d = new Date(data);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
