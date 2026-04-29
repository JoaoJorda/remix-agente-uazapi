import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, MoreVertical, Phone, Paperclip, Send, Check, CheckCheck, 
  Smile, Play, Loader2, MessageSquare, Info, X, Mail, 
  Tag, Bot, User, Pause, Brain, Plus, Copy, Ban, PhoneOff, UserCheck, Wifi, Zap
} from 'lucide-react';
import { MessageDirection, MessageType, UIConversation, UIMessage, ConversationStatus, TagDefinition } from '../types';
import { Button } from './Button';
import { useConversations } from '../hooks/useConversations';
import { toast } from 'sonner';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { api } from '@/services/api';
import { TagSelector } from './TagSelector';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const ChatInterface: React.FC = () => {
  const { conversations, loading, sendMessage, updateStatus, markAsRead, assignConversation } = useConversations();
  const { sdrName, companyName } = useCompanySettings();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Mobile: 'list' | 'chat' | 'profile'
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'profile'>('list');
  const [availableTags, setAvailableTags] = useState<TagDefinition[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const containerLeft = containerRef.current.getBoundingClientRect().left;
      const newWidth = ev.clientX - containerLeft;
      // Clamp between 220px and 500px
      setSidebarWidth(Math.min(500, Math.max(220, newWidth)));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);
  
  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  
  const activeChat = conversations.find(c => c.id === selectedChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Format audio time helper
  const formatAudioTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load tag definitions and team members
  useEffect(() => {
    api.fetchTagDefinitions().then(setAvailableTags).catch(err => {
      console.error('Error loading tags:', err);
      toast.error('Erro ao carregar tags');
    });

    api.fetchTeam().then(setTeamMembers).catch(err => {
      console.error('Error loading team members:', err);
    });
  }, []);

  // Auto-select first conversation or from URL param
  useEffect(() => {
    // Check for conversation param in URL
    const urlParams = new URLSearchParams(window.location.search);
    const conversationParam = urlParams.get('conversation');
    
    if (conversationParam && conversations.some(c => c.id === conversationParam)) {
      setSelectedChatId(conversationParam);
    } else if (conversations.length > 0 && !selectedChatId) {
      // On desktop auto-select first; on mobile keep list view
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) setSelectedChatId(conversations[0].id);
    }
  }, [conversations, selectedChatId]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedChatId && (activeChat?.unreadCount ?? 0) > 0) {
      markAsRead(selectedChatId);
    }
  }, [selectedChatId, activeChat?.unreadCount, markAsRead]);

  // Sync notes value with active chat
  useEffect(() => {
    if (activeChat) {
      setNotesValue(activeChat.notes || '');
    }
  }, [activeChat?.id]);

  // Handle notes save on blur
  const handleNotesBlur = async () => {
    if (!activeChat || notesValue === (activeChat.notes || '')) return;
    
    setIsSavingNotes(true);
    try {
      await api.updateContactNotes(activeChat.contactId, notesValue);
      toast.success('Notas salvas');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar notas');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeChat) {
      scrollToBottom();
    }
  }, [activeChat?.id, selectedChatId]); 

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const handleToggleTag = async (tagKey: string) => {
    if (!activeChat) return;
    
    const currentTags = activeChat.tags || [];
    const newTags = currentTags.includes(tagKey)
      ? currentTags.filter(t => t !== tagKey)
      : [...currentTags, tagKey];
    
    try {
      await api.updateContactTags(activeChat.contactId, newTags);
      toast.success('Tag atualizada');
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Erro ao atualizar tag');
    }
  };

  const handleCreateTag = async (tag: { key: string; label: string; color: string; category: string }) => {
    try {
      const newTag = await api.createTagDefinition(tag);
      setAvailableTags(prev => [...prev, newTag]);
      toast.success('Tag criada com sucesso');
      
      // Adicionar a tag ao contato automaticamente
      if (activeChat) {
        await handleToggleTag(tag.key);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Erro ao criar tag');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const content = inputText.trim();
    setInputText('');
    
    await sendMessage(activeChat.id, content);
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    if (!activeChat) return;
    await updateStatus(activeChat.id, status);
  };

  const filteredConversations = conversations.filter(chat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      chat.contactName.toLowerCase().includes(query) ||
      chat.contactPhone.includes(query) ||
      chat.lastMessage.toLowerCase().includes(query)
    );
  });

  const renderStatusBadge = (status: ConversationStatus) => {
    const config = {
      nina: { label: sdrName, icon: Bot, color: 'bg-violet-500/20 text-violet-600 border-violet-500/30' },
      human: { label: 'Humano', icon: User, color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
      paused: { label: 'Pausado', icon: Pause, color: 'bg-amber-500/20 text-amber-600 border-amber-500/30' }
    };
    const { label, icon: Icon, color } = config[status];
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  const isValidMediaUrl = (url: string | null): boolean => {
    if (!url) return false;
    // Must be a full URL (starts with http/https) and not an encrypted WhatsApp path
    return (url.startsWith('http://') || url.startsWith('https://')) && 
           !url.includes('.enc') &&
           !url.includes('mmg.whatsapp.net');
  };

  const renderMessageContent = (msg: UIMessage) => {
    if (msg.type === MessageType.IMAGE) {
      const hasValidUrl = isValidMediaUrl(msg.mediaUrl);
      const isProcessing = !hasValidUrl;
      const isImgLoading = loadingImages[msg.id] !== false && hasValidUrl;

      return (
        <div className="mb-1 group relative">
          {isProcessing ? (
            <div className="flex items-center gap-2 py-3 px-4 min-w-[180px]">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Carregando imagem...</span>
            </div>
          ) : (
            <>
              {isImgLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <img 
                src={msg.mediaUrl!} 
                alt="Anexo" 
                className="rounded-lg max-w-full h-auto max-h-72 object-cover border border-border shadow-lg"
                loading="lazy"
                onLoad={() => setLoadingImages(prev => ({ ...prev, [msg.id]: false }))}
                onError={(e) => {
                  setLoadingImages(prev => ({ ...prev, [msg.id]: false }));
                  (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/f1f5f9/64748b?text=Erro+Imagem';
                }}
              />
            </>
          )}
          {msg.content && msg.content !== '[Imagem]' && msg.content !== '[imagem recebida]' && (
            <p className="mt-1 leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
          )}
        </div>
      );
    }

    if (msg.type === MessageType.AUDIO) {
      const hasValidUrl = isValidMediaUrl(msg.mediaUrl);
      
      if (!hasValidUrl) {
        return (
          <div className="flex items-center gap-3 min-w-[220px] py-1">
            <div className={`flex items-center justify-center w-9 h-9 rounded-full ${
              msg.direction === MessageDirection.OUTGOING ? 'bg-white/20' : 'bg-muted'
            }`}>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
            <div className="flex-1 flex flex-col gap-1 justify-center h-9">
              <div className={`h-[6px] rounded-full overflow-hidden ${
                msg.direction === MessageDirection.OUTGOING ? 'bg-white/20' : 'bg-muted'
              }`}>
                <div className="h-full w-2/5 rounded-full bg-muted-foreground/30 animate-[pulse_1.5s_ease-in-out_infinite]" />
              </div>
              <span className={`text-[10px] font-medium ${
                msg.direction === MessageDirection.OUTGOING ? 'text-white/70' : 'text-muted-foreground'
              }`}>Processando áudio...</span>
            </div>
          </div>
        );
      }

      const isPlaying = playingAudioId === msg.id;
      const duration = audioDurations[msg.id] || 0;
      const progress = audioProgress[msg.id] || 0;
      const progressPercent = duration ? (progress / duration) * 100 : 0;
      const isAudioReady = duration > 0;
      
      const togglePlay = () => {
        if (!isAudioReady) return;
        const audio = audioRefs.current[msg.id];
        if (!audio) return;
        
        if (isPlaying) {
          audio.pause();
          setPlayingAudioId(null);
        } else {
          Object.values(audioRefs.current).forEach(a => a.pause());
          audio.play();
          setPlayingAudioId(msg.id);
        }
      };

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 min-w-[220px] py-1">
            <audio
              ref={el => { if (el) audioRefs.current[msg.id] = el; }}
              src={msg.mediaUrl!}
              preload="metadata"
              onLoadedMetadata={(e) => {
                const audio = e.currentTarget;
                setAudioDurations(prev => ({ ...prev, [msg.id]: audio.duration }));
              }}
              onTimeUpdate={(e) => {
                const audio = e.currentTarget;
                setAudioProgress(prev => ({ ...prev, [msg.id]: audio.currentTime }));
              }}
              onEnded={() => setPlayingAudioId(null)}
            />
            
            <button 
              onClick={togglePlay}
              disabled={!isAudioReady}
              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all shadow-md flex-shrink-0 ${
                !isAudioReady
                  ? (msg.direction === MessageDirection.OUTGOING ? 'bg-white/20' : 'bg-muted')
                  : msg.direction === MessageDirection.OUTGOING 
                    ? 'bg-white text-primary hover:bg-primary/10' 
                    : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {!isAudioReady ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
              )}
            </button>
            
            <div className="flex-1 flex flex-col gap-1 justify-center h-9">
              {/* Waveform-style progress bar */}
              <div 
                className={`relative h-[18px] flex items-center gap-[2px] cursor-pointer`}
                onClick={(e) => {
                  const audio = audioRefs.current[msg.id];
                  if (!audio || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  audio.currentTime = percent * duration;
                }}
              >
                {/* Generate waveform bars */}
                {Array.from({ length: 28 }).map((_, i) => {
                  const barPercent = (i / 28) * 100;
                  const isActive = barPercent < progressPercent;
                  // Pseudo-random heights for waveform effect
                  const heights = [40, 65, 50, 85, 70, 55, 90, 60, 75, 45, 80, 55, 95, 65, 50, 70, 85, 45, 60, 90, 55, 75, 50, 80, 65, 45, 70, 55];
                  const h = heights[i % heights.length];
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors duration-150 ${
                        isActive
                          ? (msg.direction === MessageDirection.OUTGOING ? 'bg-white' : 'bg-primary')
                          : (msg.direction === MessageDirection.OUTGOING ? 'bg-white/30' : 'bg-muted-foreground/25')
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>
              <span className={`text-[10px] font-medium ${
                msg.direction === MessageDirection.OUTGOING ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}>
                {isPlaying || progress > 0 ? formatAudioTime(progress) : formatAudioTime(duration)} {duration > 0 ? `/ ${formatAudioTime(duration)}` : ''}
              </span>
            </div>
          </div>
          {/* Show transcription below audio if available */}
          {msg.content && msg.content !== '[Áudio]' && msg.content !== '[áudio - processando transcrição...]' && (
            <p className={`text-xs italic mt-0.5 ${
              msg.direction === MessageDirection.OUTGOING ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>📝 {msg.content}</p>
          )}
        </div>
      );
    }

    if (msg.type === MessageType.DOCUMENT) {
      const hasValidUrl = isValidMediaUrl(msg.mediaUrl);
      const fileName = msg.content || '[Documento]';
      
      return (
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-3 py-2 px-3 rounded-lg min-w-[200px] ${
            msg.direction === MessageDirection.OUTGOING ? 'bg-white/10' : 'bg-muted/50'
          }`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
              msg.direction === MessageDirection.OUTGOING ? 'bg-white/20' : 'bg-primary/10'
            }`}>
              <Paperclip className={`w-5 h-5 ${
                msg.direction === MessageDirection.OUTGOING ? 'text-white' : 'text-primary'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${
                msg.direction === MessageDirection.OUTGOING ? 'text-white' : 'text-foreground'
              }`}>
                {fileName.replace('[Documento]', 'Documento').replace('[documento recebido]', 'Documento')}
              </p>
              <p className={`text-[10px] ${
                msg.direction === MessageDirection.OUTGOING ? 'text-white/60' : 'text-muted-foreground'
              }`}>
                {hasValidUrl ? 'Documento recebido' : 'Processando...'}
              </p>
            </div>
            {hasValidUrl && (
              <a 
                href={msg.mediaUrl!} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                  msg.direction === MessageDirection.OUTGOING ? 'text-white' : 'text-primary'
                }`}
              >
                <Info className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === MessageType.VIDEO) {
      const hasValidUrl = isValidMediaUrl(msg.mediaUrl);
      
      return (
        <div className="mb-1">
          {!hasValidUrl ? (
            <div className="flex items-center gap-2 py-3 px-4 min-w-[180px]">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Processando vídeo...</span>
            </div>
          ) : (
            <video 
              src={msg.mediaUrl!}
              controls
              className="rounded-lg max-w-full max-h-72 border border-border shadow-lg"
              preload="metadata"
            />
          )}
          {msg.content && msg.content !== '[Vídeo]' && msg.content !== '[vídeo recebido]' && (
            <p className="mt-1 leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
          )}
        </div>
      );
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
  };

  if (loading) {
    return (
      <div className="flex h-full bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Sincronizando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full bg-background rounded-tl-2xl overflow-hidden border-t border-l border-border shadow-2xl">
      
      {/* Left Sidebar: Chat List */}
      <div
        className={`
          ${mobileView === 'list' ? 'flex' : 'hidden'}
          ${showProfileInfo ? 'md:hidden' : 'md:flex'}
          flex-col bg-card/50 backdrop-blur-md z-20 flex-shrink-0
          border-r border-border
          w-full
        `}
        style={{ width: window.innerWidth >= 768 && !showProfileInfo ? sidebarWidth : undefined }}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-4 px-1">Chats Ativos</h2>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
              <p className="text-xs mt-1 opacity-70">As conversas aparecerão aqui quando receberem mensagens</p>
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => {
                  setSelectedChatId(chat.id);
                  setMobileView('chat');
                }}
                className={`flex items-center p-4 cursor-pointer transition-all duration-200 border-b border-border/30 hover:bg-muted/50 ${
                  selectedChatId === chat.id 
                    ? 'bg-muted/80 border-l-2 border-l-primary' 
                    : 'border-l-2 border-l-transparent'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-muted to-background">
                    <img 
                      src={chat.contactAvatar} 
                      alt={chat.contactName} 
                      className="w-full h-full rounded-full object-cover border border-border" 
                    />
                  </div>
                  {chat.unreadCount > 0 ? (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent border-2 border-card rounded-full animate-pulse"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-muted-foreground/50 border-2 border-card rounded-full"></span>
                  )}
                </div>
                
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-sm font-semibold truncate ${selectedChatId === chat.id ? 'text-foreground' : 'text-foreground/80'}`}>
                      {chat.contactName}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-medium">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.messages[chat.messages.length - 1]?.type === MessageType.IMAGE ? '📷 Imagem' : 
                     chat.messages[chat.messages.length - 1]?.type === MessageType.AUDIO ? '🎵 Áudio' : 
                     chat.lastMessage || 'Sem mensagens'}
                  </p>
                  
                  <div className="flex items-center mt-2 gap-1.5 flex-wrap">
                    {renderStatusBadge(chat.status)}
                    {/* Instance name badge */}
                    {chat.instanceName && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 flex-shrink-0 bg-blue-500/20 text-blue-600 border-blue-500/30">
                        <Zap className="w-3 h-3" />{chat.instanceName}
                      </span>
                    )}
                    {chat.tags.slice(0, 1).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded-md font-medium">
                        {tag}
                      </span>
                    ))}
                    {chat.unreadCount > 0 && (
                      <span className="ml-auto bg-gradient-to-r from-primary to-accent text-white text-[10px] font-bold px-1.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full shadow-lg shadow-primary/20">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resize Handle - desktop only, hidden when profile is open */}
      {!showProfileInfo && (
        <div
          className="hidden md:flex items-center justify-center w-1 hover:w-1.5 bg-border hover:bg-primary/40 cursor-col-resize flex-shrink-0 transition-all duration-150 group relative z-30"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="w-0.5 h-8 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
        </div>
      )}


      {activeChat ? (
        <div className={`
          ${mobileView === 'chat' || mobileView === 'profile' ? 'flex' : 'hidden'}
          md:flex flex-1 overflow-hidden bg-background
        `}>
          {/* Main Chat Content */}
          <div className={`
            ${mobileView === 'profile' ? 'hidden' : 'flex'}
            md:flex flex-1 flex-col min-w-0 relative
          `}>
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            {/* Chat Header */}
            <div className="h-16 px-3 md:px-4 flex items-center justify-between bg-card/80 backdrop-blur-md border-b border-border z-10 shrink-0 gap-2 min-w-0">
              {/* Left: back + contact info */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {/* Back button - mobile only */}
                <button
                  className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  onClick={() => setMobileView('list')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div 
                  className="flex items-center cursor-pointer hover:bg-muted/50 p-1.5 rounded-lg transition-colors min-w-0"
                  onClick={() => setShowProfileInfo(!showProfileInfo)}
                >
                  <div className="relative flex-shrink-0">
                    <img src={activeChat.contactAvatar} alt={activeChat.contactName} className="w-8 h-8 rounded-full ring-2 ring-border" />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-card rounded-full"></span>
                  </div>
                  <div className="ml-2 min-w-0">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{activeChat.contactName}</span>
                    </h2>
                    <p className="text-xs text-primary font-medium truncate">{activeChat.contactPhone}</p>
                  </div>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Status buttons - hidden on very small screens, show on sm+ */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`hidden sm:inline-flex text-muted-foreground hover:text-foreground h-8 w-8 ${activeChat.status === 'nina' ? 'bg-violet-500/20 text-violet-600' : ''}`}
                  onClick={() => handleStatusChange('nina')}
                  title={`Ativar ${sdrName} (IA)`}
                >
                  <Bot className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`hidden sm:inline-flex text-muted-foreground hover:text-foreground h-8 w-8 ${activeChat.status === 'human' ? 'bg-emerald-500/20 text-emerald-600' : ''}`}
                  onClick={() => handleStatusChange('human')}
                  title="Assumir conversa"
                >
                  <User className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`hidden sm:inline-flex text-muted-foreground hover:text-foreground h-8 w-8 ${activeChat.status === 'paused' ? 'bg-amber-500/20 text-amber-600' : ''}`}
                  onClick={() => handleStatusChange('paused')}
                  title="Pausar conversa"
                >
                  <Pause className="w-4 h-4" />
                </Button>
                <div className="h-5 w-px bg-border mx-0.5 hidden sm:block"></div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`text-muted-foreground hover:text-foreground h-8 w-8 ${showProfileInfo ? 'bg-muted text-primary' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setMobileView('profile');
                    } else {
                      setShowProfileInfo(!showProfileInfo);
                    }
                  }}
                  title="Ver Informações"
                >
                  <Info className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      title="Mais opções"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {/* Status options for mobile */}
                    <div className="sm:hidden">
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('nina')}
                        className={`gap-2 cursor-pointer ${activeChat.status === 'nina' ? 'text-violet-600' : ''}`}
                      >
                        <Bot className="w-4 h-4" />
                        Ativar {sdrName} (IA)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('human')}
                        className={`gap-2 cursor-pointer ${activeChat.status === 'human' ? 'text-emerald-600' : ''}`}
                      >
                        <User className="w-4 h-4" />
                        Assumir conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('paused')}
                        className={`gap-2 cursor-pointer ${activeChat.status === 'paused' ? 'text-amber-600' : ''}`}
                      >
                        <Pause className="w-4 h-4" />
                        Pausar conversa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </div>
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(activeChat.contactPhone);
                        toast.success('Telefone copiado!');
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar telefone
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setMobileView('profile');
                        } else {
                          setShowProfileInfo(true);
                        }
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      Ver perfil do contato
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          await api.toggleContactBlock(activeChat.contactId, true, 'Bloqueado manualmente pelo agente');
                          toast.success('Contato bloqueado');
                        } catch {
                          toast.error('Erro ao bloquear contato');
                        }
                      }}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Ban className="w-4 h-4" />
                      Bloquear contato
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-0">
              {activeChat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs mt-1 opacity-70">Envie uma mensagem para iniciar a conversa</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center my-6">
                    <span className="px-4 py-1.5 bg-muted border border-border text-muted-foreground text-xs font-medium rounded-full shadow-sm backdrop-blur-sm">Hoje</span>
                  </div>

                  {activeChat.messages.map((msg) => {
                    const isOutgoing = msg.direction === MessageDirection.OUTGOING;
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex flex-col max-w-[75%] ${isOutgoing ? 'items-end' : 'items-start'}`}>
                          <div 
                            className={`px-5 py-3 rounded-2xl shadow-md relative text-sm leading-relaxed ${
                              isOutgoing 
                                ? msg.fromType === 'nina'
                                  ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-tr-sm shadow-violet-500/20'
                                  : 'bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm shadow-primary/20'
                                : 'bg-muted text-foreground rounded-tl-sm border border-border'
                            }`}
                          >
                            {renderMessageContent(msg)}
                          </div>
                          
                          <div className="flex items-center mt-1.5 gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity px-1">
                            {isOutgoing && msg.fromType === 'nina' && (
                              <Bot className="w-3 h-3 text-violet-500" />
                            )}
                            {isOutgoing && msg.fromType === 'human' && (
                              <User className="w-3 h-3 text-primary" />
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium">{msg.timestamp}</span>
                            {isOutgoing && (
                              msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-primary" /> : 
                              msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" /> :
                              <Check className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card/90 border-t border-border backdrop-blur-sm z-10">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex items-center gap-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    disabled
                    title="Em breve: Emoji picker"
                    className="text-muted-foreground rounded-full cursor-not-allowed opacity-50"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    disabled
                    title="Em breve: Enviar anexos"
                    className="text-muted-foreground rounded-full cursor-not-allowed opacity-50"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex-1 bg-background rounded-2xl border border-border focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all shadow-inner">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={activeChat.status === 'nina' ? `${sdrName} está respondendo automaticamente...` : 'Digite sua mensagem...'}
                    className="w-full bg-transparent border-none p-3.5 max-h-32 min-h-[48px] text-sm text-foreground focus:ring-0 resize-none outline-none placeholder:text-muted-foreground"
                    rows={1}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className={`rounded-full w-12 h-12 p-0 transition-all ${
                    inputText.trim() 
                      ? 'shadow-lg shadow-primary/20 hover:scale-105 active:scale-95' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </Button>
              </form>
            </div>
          </div>

          {/* Right Profile Sidebar (CRM View) */}
          <div 
            className={`
              ${mobileView === 'profile' ? 'flex' : 'hidden'}
              md:flex
              ${showProfileInfo ? 'md:w-80 md:border-l md:border-border md:opacity-100' : 'md:w-0 md:opacity-0 md:border-none'}
              w-full transition-all duration-300 ease-in-out bg-card flex-shrink-0 flex-col overflow-hidden
            `}
          >
            <div className="w-full md:w-80 h-full flex flex-col">
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0 gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Back button - mobile only */}
                  <button
                    className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    onClick={() => setMobileView('chat')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="font-semibold text-foreground text-sm truncate">Informações do Lead</span>
                </div>
                <button 
                  onClick={() => {
                    setShowProfileInfo(false);
                    setMobileView('chat');
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Identity */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-accent shadow-xl mb-4">
                    <img src={activeChat.contactAvatar} alt={activeChat.contactName} className="w-full h-full rounded-full object-cover border-2 border-card" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{activeChat.contactName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeChat.clientMemory.lead_profile.lead_stage === 'new' ? 'Novo Lead' : 
                     activeChat.clientMemory.lead_profile.lead_stage === 'qualified' ? 'Lead Qualificado' :
                     activeChat.clientMemory.lead_profile.lead_stage}
                  </p>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados de Contato</h4>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Telefone</span>
                      <span className="text-foreground font-medium">{activeChat.contactPhone}</span>
                    </div>
                  </div>

                  {activeChat.contactEmail && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Email</span>
                        <span className="text-foreground font-medium">{activeChat.contactEmail}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-border w-full"></div>

                {/* AI Memory Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Memória do(a) {sdrName}
                  </h4>
                  
                  {activeChat.clientMemory.lead_profile.interests.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <span className="text-xs text-muted-foreground">Interesses</span>
                      <p className="text-sm text-foreground mt-1">
                        {activeChat.clientMemory.lead_profile.interests.join(', ')}
                      </p>
                    </div>
                  )}

                  {activeChat.clientMemory.sales_intelligence.pain_points.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <span className="text-xs text-muted-foreground">Dores Identificadas</span>
                      <p className="text-sm text-foreground mt-1">
                        {activeChat.clientMemory.sales_intelligence.pain_points.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-xs text-muted-foreground">Próxima Ação Sugerida</span>
                    <p className="text-sm text-foreground mt-1">
                      {activeChat.clientMemory.sales_intelligence.next_best_action === 'qualify' ? 'Qualificar lead' :
                       activeChat.clientMemory.sales_intelligence.next_best_action === 'demo' ? 'Agendar demonstração' :
                       activeChat.clientMemory.sales_intelligence.next_best_action}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    Total de conversas: {activeChat.clientMemory.interaction_summary.total_conversations}
                  </div>
                </div>

                <div className="h-px bg-border w-full"></div>

                {/* Assigned User */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Responsável
                  </h4>
                  <select
                    value={activeChat.assignedUserId || ''}
                    onChange={(e) => {
                      const userId = e.target.value || null;
                      assignConversation(activeChat.id, userId);
                      toast.success('Conversa atribuída. Deal atualizado automaticamente.');
                    }}
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                  >
                    <option value="">Não atribuído</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="h-px bg-border w-full"></div>

                {/* Tags */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    Tags
                    <Popover open={isTagSelectorOpen} onOpenChange={setIsTagSelectorOpen}>
                      <PopoverTrigger asChild>
                        <button className="text-primary hover:text-primary/80 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 bg-card border-border" align="end">
                        <TagSelector 
                          availableTags={availableTags}
                          selectedTags={activeChat.tags || []}
                          onToggleTag={handleToggleTag}
                          onCreateTag={handleCreateTag}
                        />
                      </PopoverContent>
                    </Popover>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeChat.tags && activeChat.tags.length > 0 ? (
                      activeChat.tags.map(tagKey => {
                        const tagDef = availableTags.find(t => t.key === tagKey);
                        return (
                          <span 
                            key={tagKey}
                            style={{ 
                              backgroundColor: tagDef?.color ? `${tagDef.color}20` : 'rgba(212, 32, 39, 0.2)',
                              borderColor: tagDef?.color || '#D42027'
                            }}
                            className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1.5 group hover:brightness-110 transition-all"
                          >
                            <span className="text-foreground">{tagDef?.label || tagKey}</span>
                            <button
                              onClick={() => handleToggleTag(tagKey)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhuma tag adicionada</p>
                    )}
                  </div>
                </div>

                {/* Notes Area */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Notas Internas
                    {isSavingNotes && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </h4>
                  <textarea 
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none resize-none transition-all"
                    rows={4}
                    placeholder="Adicione observações sobre este lead..."
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    onBlur={handleNotesBlur}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-transparent"></div>
          <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-md">
            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-6 shadow-2xl border border-border relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-1000"></div>
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{companyName} Workspace</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {conversations.length === 0 
                ? 'Aguardando novas conversas. Configure o webhook do WhatsApp para começar a receber mensagens.'
                : 'Selecione uma conversa ao lado para iniciar o atendimento inteligente.'}
            </p>
            <div className="mt-8 flex gap-3 text-xs text-muted-foreground font-mono bg-card px-4 py-2 rounded-lg border border-border">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {sdrName} Online
              </span>
              <span className="w-px h-4 bg-border"></span>
              <span>{conversations.length} conversas</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;