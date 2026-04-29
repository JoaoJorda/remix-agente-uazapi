import { Contact, Conversation, MessageDirection, MessageType, StatMetric, TeamMember, Appointment, Deal, KanbanColumn } from "./types";

export const STATS: StatMetric[] = [
  { label: 'Atendimentos Hoje', value: '142', trend: '+12%', trendUp: true },
  { label: 'Vendas Convertidas', value: 'R$ 4.250', trend: '+5%', trendUp: true },
  { label: 'Tempo Médio (TMA)', value: '4m 12s', trend: '-2%', trendUp: true }, // Down is good for TMA
  { label: 'Novos Leads', value: '28', trend: '-5%', trendUp: false },
];

export const MOCK_TEAM: TeamMember[] = [
  { 
    id: 't1', 
    name: 'Admin User', 
    email: 'admin@empresa.com', 
    role: 'admin', 
    status: 'active', 
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0891b2&color=fff',
    lastActive: 'Agora'
  },
  { 
    id: 't2', 
    name: 'Sarah Connor', 
    email: 'sarah@empresa.com', 
    role: 'manager', 
    status: 'active', 
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    lastActive: 'Há 5 min'
  },
  { 
    id: 't3', 
    name: 'John Doe', 
    email: 'john@empresa.com', 
    role: 'agent', 
    status: 'invited', 
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=334155&color=fff',
    lastActive: '-'
  },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'Ana Silva', phone: '+55 11 99999-0001', email: 'ana@email.com', status: 'customer', lastContact: '2023-10-25' },
  { id: '2', name: 'Carlos Souza', phone: '+55 11 99999-0002', email: 'carlos@tech.com', status: 'lead', lastContact: '2023-10-26' },
  { id: '3', name: 'Beatriz Costa', phone: '+55 11 99999-0003', email: 'bia@design.com', status: 'churned', lastContact: '2023-09-10' },
  { id: '4', name: 'João Pereira', phone: '+55 11 99999-0004', email: 'joao@corp.com', status: 'lead', lastContact: '2023-10-27' },
  { id: '5', name: 'Fernanda Lima', phone: '+55 11 99999-0005', email: 'nanda@email.com', status: 'customer', lastContact: '2023-10-27' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    contactName: 'Carlos Souza',
    contactPhone: '+55 11 99999-0002',
    contactAvatar: 'https://picsum.photos/seed/carlos/200/200',
    lastMessage: 'Qual o valor do plano Enterprise?',
    lastMessageTime: '10:46',
    unreadCount: 2,
    tags: ['Interessado', 'SaaS'],
    messages: [
      { id: 'm1', content: 'Olá, bom dia! Gostaria de saber mais sobre a automação.', timestamp: '10:30', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Bom dia Carlos! Claro, como posso ajudar?', timestamp: '10:32', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm3', content: 'Qual o valor do plano Enterprise?', timestamp: '10:42', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'delivered' },
      { id: 'm4', content: 'Seguem os comparativos visuais que solicitou.', timestamp: '10:44', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm5', content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop', timestamp: '10:44', direction: MessageDirection.OUTGOING, type: MessageType.IMAGE, status: 'read' },
      { id: 'm6', content: 'Audio Message', timestamp: '10:46', direction: MessageDirection.INCOMING, type: MessageType.AUDIO, status: 'delivered' },
    ]
  },
  {
    id: 'c2',
    contactName: 'Ana Silva',
    contactPhone: '+55 11 99999-0001',
    contactAvatar: 'https://picsum.photos/seed/ana/200/200',
    lastMessage: 'Obrigada pelo suporte!',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    tags: ['Cliente', 'Suporte'],
    messages: [
      { id: 'm1', content: 'Meu acesso foi restabelecido.', timestamp: '14:20', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Que ótima notícia, Ana! Precisando é só chamar.', timestamp: '14:25', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm3', content: 'Obrigada pelo suporte!', timestamp: '14:26', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
    ]
  },
  {
    id: 'c3',
    contactName: 'João Pereira',
    contactPhone: '+55 11 99999-0004',
    contactAvatar: 'https://picsum.photos/seed/joao/200/200',
    lastMessage: 'Vou verificar com meu sócio.',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    tags: ['Negociação'],
    messages: [
      { id: 'm1', content: 'Conseguimos fazer por R$ 200/mês no anual.', timestamp: '16:00', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Vou verificar com meu sócio.', timestamp: '16:15', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
    ]
  }
];

// Gerar datas dinâmicas para o mês atual
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const getDateString = (day: number) => {
    return new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
};

export const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 'evt1',
        title: 'Demo da Plataforma',
        date: getDateString(5),
        time: '14:00',
        duration: 60,
        type: 'demo',
        attendees: ['Carlos Souza'],
        description: 'Apresentação geral dos módulos de IA.'
    },
    {
        id: 'evt2',
        title: 'Reunião Semanal',
        date: getDateString(12),
        time: '10:00',
        duration: 30,
        type: 'meeting',
        description: 'Alinhamento de metas com SDRs.'
    },
    {
        id: 'evt3',
        title: 'Suporte Técnico - Ana',
        date: getDateString(15),
        time: '16:30',
        duration: 45,
        type: 'support',
        attendees: ['Ana Silva'],
        description: 'Resolução de problema de integração API.'
    },
    {
        id: 'evt4',
        title: 'Follow-up João',
        date: getDateString(18),
        time: '11:00',
        duration: 15,
        type: 'followup',
        attendees: ['João Pereira'],
        description: 'Verificar se ele conversou com o sócio.'
    },
     {
        id: 'evt5',
        title: 'Demo Enterprise',
        date: getDateString(25),
        time: '15:00',
        duration: 60,
        type: 'demo',
        attendees: ['Diretor One Corp'],
        description: 'Demo focada em enterprise.'
    }
];

export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'new', title: 'Novos Leads', color: 'border-slate-500', position: 0, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'qualification', title: 'Qualificação', color: 'border-cyan-500', position: 1, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'presentation', title: 'Apresentação', color: 'border-violet-500', position: 2, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'negotiation', title: 'Negociação', color: 'border-orange-500', position: 3, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'won', title: 'Fechado / Ganho', color: 'border-emerald-500', position: 4, isSystem: true, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'lost', title: 'Perdido', color: 'border-red-500', position: 5, isSystem: true, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
];

export const MOCK_DEALS: Deal[] = [
  {
    id: 'd1',
    title: 'Implantação Chatbot',
    company: 'Tech Solutions Ltd',
    value: 5000,
    stage: 'new',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0891b2&color=fff',
    tags: ['Hot', 'Indicação'],
    priority: 'high'
  },
  {
    id: 'd2',
    title: 'Automação WhatsApp',
    company: 'Clínica Saúde',
    value: 2500,
    stage: 'qualification',
    ownerAvatar: 'https://i.pravatar.cc/150?u=sarah',
    tags: ['Saúde'],
    priority: 'medium'
  },
  {
    id: 'd3',
    title: 'Plano Enterprise',
    company: 'Grupo Varejo Sul',
    value: 15000,
    stage: 'presentation',
    ownerAvatar: 'https://ui-avatars.com/api/?name=John+Doe&background=334155&color=fff',
    tags: ['Enterprise', 'Reunião'],
    priority: 'high',
    dueDate: '2023-11-10'
  },
  {
    id: 'd4',
    title: 'Consultoria IA',
    company: 'Advocacia Silva',
    value: 8000,
    stage: 'negotiation',
    ownerAvatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0891b2&color=fff',
    tags: ['Jurídico'],
    priority: 'medium'
  },
  {
    id: 'd5',
    title: 'Licença Anual',
    company: 'StartUp Hub',
    value: 3000,
    stage: 'new',
    ownerAvatar: 'https://i.pravatar.cc/150?u=sarah',
    tags: ['SaaS'],
    priority: 'low'
  },
  {
    id: 'd6',
    title: 'Renovação Contrato',
    company: 'Logística Express',
    value: 12000,
    stage: 'won',
    ownerAvatar: 'https://ui-avatars.com/api/?name=John+Doe&background=334155&color=fff',
    tags: ['Renovação'],
    priority: 'high'
  }
];
