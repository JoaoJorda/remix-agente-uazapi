import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layout, Monitor, Server, Database, GitBranch, Palette, Key, FileCode, MessageSquare, Calendar, Users, BarChart3, Settings, Zap, Layers, Smartphone, ExternalLink, Copy, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const SystemRoadmap: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['quickstart']);

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const sections: Section[] = [
    {
      id: 'post-remix-checklist',
      title: '🔄 Checklist Pós-Remix (IMPORTANTE)',
      icon: AlertTriangle,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-lg p-6">
            <p className="text-slate-300 mb-4">
              <strong className="text-amber-400">ATENÇÃO:</strong> Após remixar o projeto, você DEVE configurar manualmente os seguintes itens para o sistema funcionar corretamente:
            </p>
            
            <div className="space-y-6">
              {/* Edge Functions - verify_jwt */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  1. Configurar verify_jwt = false nas Edge Functions
                </h4>
                <p className="text-slate-400 text-sm mb-3">
                  Edite o arquivo <code className="text-cyan-400">supabase/config.toml</code> e adicione/atualize:
                </p>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 overflow-x-auto">
                  <pre className="text-xs text-emerald-400 font-mono whitespace-pre">{`[functions.whatsapp-webhook]
verify_jwt = false

[functions.message-grouper]
verify_jwt = false

[functions.nina-orchestrator]
verify_jwt = false

[functions.whatsapp-sender]
verify_jwt = false

[functions.initialize-system]
verify_jwt = false

[functions.validate-setup]
verify_jwt = false

[functions.simulate-webhook]
verify_jwt = false

[functions.simulate-audio-webhook]
verify_jwt = false

[functions.test-whatsapp-message]
verify_jwt = false

[functions.trigger-nina-orchestrator]
verify_jwt = false

[functions.trigger-whatsapp-sender]
verify_jwt = false

[functions.health-check]
verify_jwt = false

[functions.seed-appointments]
verify_jwt = false

[functions.generate-prompt]
verify_jwt = false

[functions.test-elevenlabs-tts]
verify_jwt = false

[functions.analyze-conversation]
verify_jwt = false`}</pre>
                </div>
              </div>
              
              {/* Meta Webhook */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  2. Configurar Webhook no Meta for Developers
                </h4>
                <div className="space-y-2 text-sm text-slate-400">
                  <p>• Acesse o dashboard do seu app no Meta for Developers</p>
                  <p>• Vá em WhatsApp → Configuration → Webhook</p>
                  <p>• Copie a URL do webhook das configurações (aba APIs)</p>
                  <p>• Cole o Verify Token configurado no sistema</p>
                  <p>• Inscreva-se nos eventos: <code className="text-cyan-400">messages</code></p>
                </div>
              </div>
              
              {/* ElevenLabs */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  3. Configurar ElevenLabs API Key (Opcional)
                </h4>
                <div className="space-y-2 text-sm text-slate-400">
                  <p>• Se quiser habilitar respostas em áudio, configure a API key da ElevenLabs</p>
                  <p>• Vá em Configurações → APIs → ElevenLabs API Key</p>
                  <p>• Obtenha sua key em <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">elevenlabs.io</a></p>
                </div>
              </div>
              
              {/* Realtime & Triggers Info */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-emerald-200 text-sm font-medium mb-1">Já Configurados Automaticamente:</p>
                    <p className="text-emerald-200/80 text-sm">
                      ✓ Supabase Realtime (messages, conversations, contacts, deals, etc.)<br />
                      ✓ Triggers do banco (auto_create_deal, update_timestamps, etc.)<br />
                      ✓ RLS Policies para modelo single-tenant<br />
                      ✓ Polling fallback quando realtime falhar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'quickstart',
      title: '🚀 Início Rápido (5 passos)',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-lg p-6">
            <p className="text-slate-300 mb-4">
              Configure seu agente de IA em poucos minutos seguindo estes passos:
            </p>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="text-white font-medium">Configure sua empresa</p>
                  <p className="text-sm text-slate-400">Na aba "Agente", preencha o nome da empresa e do agente de IA</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="text-white font-medium">Personalize o prompt</p>
                  <p className="text-sm text-slate-400">Edite o prompt do sistema com as informações do seu negócio ou use o "Gerar com IA"</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="text-white font-medium">Conecte o WhatsApp</p>
                  <p className="text-sm text-slate-400">Na aba "APIs", configure o Access Token e Phone Number ID do WhatsApp Cloud API</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <p className="text-white font-medium">Configure o Webhook</p>
                  <p className="text-sm text-slate-400">Copie a URL e o Verify Token para configurar no Meta for Developers</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">✓</div>
                <div>
                  <p className="text-white font-medium">Pronto!</p>
                  <p className="text-sm text-slate-400">Seu agente está configurado e pronto para receber mensagens no WhatsApp</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400">
              <strong className="text-amber-400">💡 Dica:</strong> As seções abaixo contêm documentação técnica detalhada 
              sobre a arquitetura do sistema. Você não precisa ler tudo para começar a usar o agente.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'whatsapp-tutorial',
      title: '📱 Tutorial: Configurar WhatsApp Business API',
      icon: Smartphone,
      content: (
        <div className="space-y-6">
          {/* Introdução */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg p-6">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Visão Geral
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              Para conectar seu agente de IA ao WhatsApp, você precisa configurar a <strong className="text-emerald-400">WhatsApp Cloud API</strong> através 
              do Meta for Developers. Este tutorial guiará você por todo o processo, passo a passo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">⏱️ Tempo estimado: 15-30 minutos</span>
              <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">💰 Custo: Gratuito para começar</span>
              <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">📋 Pré-requisito: Conta Meta/Facebook</span>
            </div>
          </div>

          {/* Passo 1: Criar conta no Meta for Developers */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">1</div>
              <div>
                <h4 className="text-white font-bold text-lg">Criar conta no Meta for Developers</h4>
                <p className="text-slate-400 text-sm">Configure sua conta de desenvolvedor no Meta</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">1.1</span>
                  <div>
                    <p className="text-slate-300">Acesse o portal de desenvolvedores do Meta:</p>
                    <a 
                      href="https://developers.facebook.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-cyan-400 text-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      developers.facebook.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">1.2</span>
                  <p className="text-slate-300">Faça login com sua conta do Facebook/Meta</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">1.3</span>
                  <p className="text-slate-300">Se for sua primeira vez, aceite os termos de desenvolvedor</p>
                </div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200 text-sm">
                    <strong>Importante:</strong> Use uma conta Meta/Facebook que você tenha acesso permanente. 
                    Evite contas pessoais - prefira criar uma conta empresarial.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 2: Criar um App */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">2</div>
              <div>
                <h4 className="text-white font-bold text-lg">Criar um App no Meta</h4>
                <p className="text-slate-400 text-sm">Crie um aplicativo para usar a WhatsApp API</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">2.1</span>
                  <p className="text-slate-300">No painel, clique em <strong className="text-white">"My Apps"</strong> → <strong className="text-white">"Create App"</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">2.2</span>
                  <div>
                    <p className="text-slate-300">Selecione o tipo de app: <strong className="text-emerald-400">"Business"</strong></p>
                    <p className="text-slate-500 text-xs mt-1">Este tipo permite acesso à WhatsApp Business API</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">2.3</span>
                  <p className="text-slate-300">Dê um nome ao seu app (ex: "Minha Empresa - WhatsApp Bot")</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">2.4</span>
                  <p className="text-slate-300">Preencha seu email de contato e clique em <strong className="text-white">"Create App"</strong></p>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  O Meta pode solicitar verificação de segurança (senha ou autenticação 2FA)
                </p>
              </div>
            </div>
          </div>

          {/* Passo 3: Adicionar WhatsApp ao App */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">3</div>
              <div>
                <h4 className="text-white font-bold text-lg">Adicionar WhatsApp ao App</h4>
                <p className="text-slate-400 text-sm">Configure o produto WhatsApp no seu app</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">3.1</span>
                  <p className="text-slate-300">No menu lateral, clique em <strong className="text-white">"Add Products"</strong> ou <strong className="text-white">"Adicionar Produtos"</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">3.2</span>
                  <p className="text-slate-300">Encontre <strong className="text-emerald-400">"WhatsApp"</strong> na lista e clique em <strong className="text-white">"Set up"</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">3.3</span>
                  <p className="text-slate-300">Selecione ou crie uma <strong className="text-white">Meta Business Account</strong> (conta comercial)</p>
                </div>
              </div>
              
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-cyan-200 text-sm">
                    O Meta oferece um número de teste gratuito para desenvolvimento. 
                    Para produção, você precisará de um número de telefone próprio verificado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 4: Obter Access Token */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">4</div>
              <div>
                <h4 className="text-white font-bold text-lg">Obter o Access Token</h4>
                <p className="text-slate-400 text-sm">Token de autenticação para a API</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">4.1</span>
                  <p className="text-slate-300">No menu lateral, vá em <strong className="text-white">WhatsApp</strong> → <strong className="text-white">API Setup</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">4.2</span>
                  <div>
                    <p className="text-slate-300">Localize a seção <strong className="text-white">"Temporary access token"</strong></p>
                    <p className="text-slate-500 text-xs mt-1">Este token expira em 24 horas - ideal para testes</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">4.3</span>
                  <p className="text-slate-300">Clique em <strong className="text-white">"Copy"</strong> para copiar o token</p>
                </div>
              </div>
              
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-2">Exemplo de Access Token:</p>
                <code className="text-xs text-emerald-400 font-mono break-all">
                  EAAGm0PX4ZCps...xK2ZBzZA
                </code>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-200 text-sm font-medium mb-1">Token Permanente (Produção)</p>
                    <p className="text-amber-200/80 text-sm">
                      Para produção, crie um <strong>System User</strong> nas configurações do Business Manager 
                      e gere um token permanente. Vá em Business Settings → System Users → Generate Token.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 5: Obter Phone Number ID e Business Account ID */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">5</div>
              <div>
                <h4 className="text-white font-bold text-lg">Obter Phone Number ID e Business Account ID</h4>
                <p className="text-slate-400 text-sm">Identificadores únicos do seu número e conta</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">5.1</span>
                  <p className="text-slate-300">Na mesma página <strong className="text-white">API Setup</strong>, role para baixo</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">5.2</span>
                  <div>
                    <p className="text-slate-300">Localize <strong className="text-emerald-400">"Phone number ID"</strong></p>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 mt-2">
                      <p className="text-xs text-slate-400 mb-1">Exemplo:</p>
                      <code className="text-sm text-emerald-400 font-mono">123456789012345</code>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">5.3</span>
                  <div>
                    <p className="text-slate-300">Localize <strong className="text-emerald-400">"WhatsApp Business Account ID"</strong></p>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 mt-2">
                      <p className="text-xs text-slate-400 mb-1">Exemplo:</p>
                      <code className="text-sm text-emerald-400 font-mono">109876543210987</code>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-cyan-200 text-sm">
                    <strong>Dica:</strong> O Phone Number ID é diferente do número de telefone em si. 
                    É um identificador interno do Meta para seu número.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 6: Configurar Webhook */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">6</div>
              <div>
                <h4 className="text-white font-bold text-lg">Configurar Webhook</h4>
                <p className="text-slate-400 text-sm">Conecte o Meta ao seu sistema para receber mensagens</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-200 text-sm">
                    <strong>Pré-requisito:</strong> Antes de configurar o webhook no Meta, você precisa ter 
                    preenchido as credenciais na aba "APIs" das Configurações do sistema. Isso gerará 
                    automaticamente a URL do Webhook e o Verify Token.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.1</span>
                  <p className="text-slate-300">No seu sistema, vá em <strong className="text-white">Configurações</strong> → <strong className="text-white">APIs</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.2</span>
                  <p className="text-slate-300">Copie a <strong className="text-emerald-400">URL do Webhook</strong> e o <strong className="text-emerald-400">Verify Token</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.3</span>
                  <p className="text-slate-300">No Meta, vá em <strong className="text-white">WhatsApp</strong> → <strong className="text-white">Configuration</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.4</span>
                  <p className="text-slate-300">Na seção <strong className="text-white">"Webhook"</strong>, clique em <strong className="text-white">"Edit"</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.5</span>
                  <p className="text-slate-300">Cole a <strong className="text-white">Callback URL</strong> (URL do Webhook do seu sistema)</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.6</span>
                  <p className="text-slate-300">Cole o <strong className="text-white">Verify Token</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">6.7</span>
                  <p className="text-slate-300">Clique em <strong className="text-white">"Verify and Save"</strong></p>
                </div>
              </div>
              
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-2">Formato da URL do Webhook:</p>
                <code className="text-xs text-emerald-400 font-mono break-all">
                  https://[project-id].supabase.co/functions/v1/whatsapp-webhook
                </code>
              </div>
            </div>
          </div>

          {/* Passo 7: Selecionar Eventos do Webhook */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">7</div>
              <div>
                <h4 className="text-white font-bold text-lg">Selecionar Eventos do Webhook</h4>
                <p className="text-slate-400 text-sm">Configure quais eventos serão enviados ao seu sistema</p>
              </div>
            </div>
            
            <div className="space-y-4 ml-14">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">7.1</span>
                  <p className="text-slate-300">Após verificar o webhook, clique em <strong className="text-white">"Manage"</strong></p>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">7.2</span>
                  <div>
                    <p className="text-slate-300 mb-2">Ative (Subscribe) os seguintes eventos:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <code className="text-emerald-400 text-sm">messages</code>
                        <span className="text-slate-500 text-xs">- Receber mensagens dos clientes</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <code className="text-emerald-400 text-sm">message_echoes</code>
                        <span className="text-slate-500 text-xs">- Confirmação de mensagens enviadas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-300">Opcional:</strong> Você também pode ativar{' '}
                  <code className="text-cyan-400">message_status</code> para receber confirmações de leitura.
                </p>
              </div>
            </div>
          </div>

          {/* Checklist Final */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Checklist Final
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">App criado no Meta for Developers</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">WhatsApp adicionado como produto</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">Access Token copiado e configurado</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">Phone Number ID copiado e configurado</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">Business Account ID copiado e configurado</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">Webhook configurado e verificado no Meta</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">Eventos <code className="text-cyan-400">messages</code> e <code className="text-cyan-400">message_echoes</code> ativados</p>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Solução de Problemas Comuns
            </h4>
            
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-amber-400 font-medium text-sm mb-2">❌ "Token expirado" ou Erro 401</p>
                <p className="text-slate-400 text-sm">
                  O token temporário expira em 24 horas. Gere um novo token na página API Setup ou 
                  crie um token permanente através de um System User.
                </p>
              </div>
              
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-amber-400 font-medium text-sm mb-2">❌ Webhook não verifica</p>
                <p className="text-slate-400 text-sm">
                  Verifique se o Verify Token está exatamente igual nos dois lugares (sistema e Meta). 
                  Certifique-se de que não há espaços extras no início ou fim.
                </p>
              </div>
              
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-amber-400 font-medium text-sm mb-2">❌ Mensagens não chegam ao sistema</p>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Verifique se os eventos estão "Subscribed" (ativados)</li>
                  <li>• Confirme que o webhook está verificado (ícone verde)</li>
                  <li>• Teste enviando uma mensagem para o número de teste</li>
                </ul>
              </div>
              
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-amber-400 font-medium text-sm mb-2">❌ Sistema não responde mensagens</p>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Verifique se o "Modo Automático" está ativado nas configurações do agente</li>
                  <li>• Confirme que o prompt do sistema está preenchido</li>
                  <li>• Verifique os logs no console do navegador</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Links Úteis */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-cyan-400" />
              Links Úteis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a 
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 text-sm">Documentação oficial WhatsApp Cloud API</span>
              </a>
              <a 
                href="https://business.facebook.com/settings" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 text-sm">Meta Business Settings</span>
              </a>
              <a 
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 text-sm">Referência da API de Mensagens</span>
              </a>
              <a 
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 text-sm">Documentação de Webhooks</span>
              </a>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'overview',
      title: '📋 Visão Geral da Arquitetura',
      icon: Layout,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-500" />
              Stack Tecnológica
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-400 mb-2">Frontend</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• React 18 com TypeScript</li>
                  <li>• Vite (build tool)</li>
                  <li>• Tailwind CSS (estilização)</li>
                  <li>• shadcn/ui (componentes)</li>
                  <li>• React Router DOM (navegação)</li>
                  <li>• Tanstack Query (cache/fetch)</li>
                  <li>• react-hook-form + zod (formulários)</li>
                  <li>• date-fns + react-day-picker (datas)</li>
                  <li>• recharts (gráficos)</li>
                  <li>• sonner (notificações)</li>
                  <li>• embla-carousel (carrosséis)</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400 mb-2">Backend</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Supabase Edge Functions (Deno)</li>
                  <li>• PostgreSQL (banco de dados)</li>
                  <li>• Row Level Security (RLS)</li>
                  <li>• Realtime subscriptions (WebSocket)</li>
                  <li>• Lovable AI Gateway (Gemini/GPT)</li>
                  <li>• WhatsApp Cloud API</li>
                  <li>• ElevenLabs TTS API</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Fluxo de Dados Principal</h4>
            <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded border border-slate-700 overflow-x-auto">
{`WhatsApp Cloud API
      ↓
[whatsapp-webhook] Edge Function
      ↓
PostgreSQL (contacts, conversations, messages)
      ↓
[nina-orchestrator] Edge Function
      ↓
Lovable AI Gateway (Gemini/GPT)
      ↓
[whatsapp-sender] Edge Function
      ↓
WhatsApp Cloud API (resposta ao cliente)`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 'frontend',
      title: '🖥️ Frontend - Páginas e Componentes',
      icon: Monitor,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left p-4 text-cyan-400 font-bold">Rota</th>
                  <th className="text-left p-4 text-cyan-400 font-bold">Componente</th>
                  <th className="text-left p-4 text-cyan-400 font-bold">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-4 font-mono text-slate-400">/dashboard</td>
                  <td className="p-4 text-white">Dashboard.tsx</td>
                  <td className="p-4 text-slate-400">Métricas principais, KPIs, gráficos de performance</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/chat</td>
                  <td className="p-4 text-white">ChatInterface.tsx</td>
                  <td className="p-4 text-slate-400">Interface de conversas WhatsApp com sidebar de contatos</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/pipeline</td>
                  <td className="p-4 text-white">Kanban.tsx</td>
                  <td className="p-4 text-slate-400">Pipeline de vendas/CRM com IA integrada para movimentação automática de deals</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/contacts</td>
                  <td className="p-4 text-white">Contacts.tsx</td>
                  <td className="p-4 text-slate-400">Lista completa de contatos com filtros e tags</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/scheduling</td>
                  <td className="p-4 text-white">Scheduling.tsx</td>
                  <td className="p-4 text-slate-400">Calendário de agendamentos com criação de reuniões</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/team</td>
                  <td className="p-4 text-white">Team.tsx</td>
                  <td className="p-4 text-slate-400">Gestão de times, membros e funções</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/settings</td>
                  <td className="p-4 text-white">Settings.tsx</td>
                  <td className="p-4 text-slate-400">Configurações do agente IA, integrações de APIs e documentação do sistema</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">/meeting/:id</td>
                  <td className="p-4 text-white">MeetingRoom.tsx</td>
                  <td className="p-4 text-slate-400">Sala de reunião virtual (rota externa)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Modais e Componentes Especiais</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-cyan-400 font-bold text-xs mb-1">CreateDealModal</p>
                <p className="text-slate-500 text-xs">Criação de novos deals no CRM</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-emerald-400 font-bold text-xs mb-1">LostReasonModal</p>
                <p className="text-slate-500 text-xs">Captura motivo de perda de deal</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-violet-400 font-bold text-xs mb-1">PipelineSettingsModal</p>
                <p className="text-slate-500 text-xs">Configuração de estágios do funil</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-amber-400 font-bold text-xs mb-1">TeamConfigModal</p>
                <p className="text-slate-500 text-xs">Gestão de times e funções</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-pink-400 font-bold text-xs mb-1">TagSelector</p>
                <p className="text-slate-500 text-xs">Seleção e criação de tags</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-blue-400 font-bold text-xs mb-1">PromptGeneratorSheet</p>
                <p className="text-slate-500 text-xs">Geração de prompts com IA</p>
              </div>
            </div>

            <h4 className="text-white font-bold mb-4">Componentes Principais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-cyan-400 font-bold mb-2">ChatInterface.tsx</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Sidebar com lista de conversas</li>
                  <li>• Área de mensagens com scroll infinito</li>
                  <li>• Input de envio com suporte a texto</li>
                  <li>• Controles de takeover (assumir/reativar IA)</li>
                  <li>• Indicadores de status e typing</li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-emerald-400 font-bold mb-2">Kanban.tsx</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Colunas dinâmicas de estágios</li>
                  <li>• Drag-and-drop entre estágios</li>
                  <li>• Modal de detalhes do deal</li>
                  <li>• Configuração de pipeline (PipelineSettingsModal)</li>
                  <li>• Estatísticas por estágio</li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-violet-400 font-bold mb-2">Settings.tsx</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Tab "Agente" (AgentSettings.tsx)</li>
                  <li>• Tab "APIs" (ApiSettings.tsx)</li>
                  <li>• Tab "Documentação" (SystemRoadmap.tsx)</li>
                  <li>• Gerador de prompts com IA</li>
                  <li>• Configuração de horários comerciais</li>
                  <li>• White-label (nome empresa/SDR)</li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <p className="text-amber-400 font-bold mb-2">Scheduling.tsx</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Visualização semanal do calendário</li>
                  <li>• Criação de agendamentos</li>
                  <li>• Duração configurável (15-120min)</li>
                  <li>• Tipos: demo, meeting, support, followup</li>
                  <li>• Link de reunião virtual</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mt-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Componentes Reutilizáveis
            </h4>
            <p className="text-slate-300 mb-4">Componentes compartilhados em <code className="text-cyan-400">src/components/</code>:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mb-6">
              <li><strong className="text-white">Button.tsx</strong>: Botão customizado com variants</li>
              <li><strong className="text-white">Sidebar.tsx</strong>: Menu lateral com navegação</li>
              <li><strong className="text-white">TagSelector.tsx</strong>: Seletor de tags para contatos</li>
              <li><strong className="text-white">CreateDealModal.tsx</strong>: Modal para criar deals</li>
              <li><strong className="text-white">LostReasonModal.tsx</strong>: Modal para marcar deal como perdido</li>
              <li><strong className="text-white">PipelineSettingsModal.tsx</strong>: Configuração de estágios</li>
              <li><strong className="text-white">TeamConfigModal.tsx</strong>: Gestão de times e funções</li>
            </ul>

            <div className="bg-slate-950 border border-slate-700 rounded-lg p-5">
              <h5 className="text-lg font-semibold text-cyan-400 mb-3">🎨 Button Component Customizado</h5>
              <p className="text-slate-300 mb-3">O componente <code className="text-cyan-400">Button.tsx</code> utiliza <code className="text-cyan-400">class-variance-authority</code> para variants tipadas:</p>
              
              <div className="bg-slate-900 rounded-lg p-4 mb-4">
                <pre className="text-sm text-slate-300 overflow-x-auto">
{`// Variants disponíveis:
- primary: Gradiente cyan/teal com sombra glow (padrão)
- secondary: Fundo slate-800, borda slate-700
- outline: Transparente com borda slate-700
- ghost: Texto slate-400, hover com bg slate-800
- danger: Vermelho com fundo transparente
- default: Igual ao secondary

// Sizes disponíveis:
- sm: h-8, px-3, text-xs
- md: h-10, px-4, text-sm (padrão)
- lg: h-12, px-8, text-base
- icon: h-10, w-10 (botão quadrado)

// Uso:
<Button variant="primary" size="md">Salvar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="danger" size="sm">Excluir</Button>`}
                </pre>
              </div>

              <p className="text-sm text-slate-400">
                ℹ️ Todos os botões incluem animação <code className="text-cyan-400">active:scale-95</code> e 
                focus ring com <code className="text-cyan-400">focus-visible:ring-2 ring-cyan-500</code>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'backend',
      title: '⚙️ Backend - Edge Functions',
      icon: Server,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left p-4 text-cyan-400 font-bold">Edge Function</th>
                  <th className="text-left p-4 text-cyan-400 font-bold">Propósito</th>
                  <th className="text-left p-4 text-cyan-400 font-bold">Autenticação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-4 font-mono text-emerald-400">whatsapp-webhook</td>
                  <td className="p-4 text-slate-300">Recebe webhooks do WhatsApp Cloud API, processa mensagens recebidas</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-cyan-400">nina-orchestrator</td>
                  <td className="p-4 text-slate-300">Processa fila de mensagens, gera respostas via IA, gerencia contexto</td>
                  <td className="p-4 text-amber-400">verify_jwt: true</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-violet-400">whatsapp-sender</td>
                  <td className="p-4 text-slate-300">Processa fila de envio, envia mensagens via WhatsApp Cloud API</td>
                  <td className="p-4 text-amber-400">verify_jwt: true</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-blue-400">analyze-conversation</td>
                  <td className="p-4 text-slate-300">Análise de conversa com IA, extração de insights, movimentação automática de deals</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-pink-400">generate-prompt</td>
                  <td className="p-4 text-slate-300">Gerador de system prompts personalizados usando Gemini 3 Pro</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">simulate-webhook</td>
                  <td className="p-4 text-slate-300">Simula mensagens recebidas para testes (desenvolvimento)</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">trigger-nina-orchestrator</td>
                  <td className="p-4 text-slate-300">Trigger auxiliar para chamar nina-orchestrator via HTTP</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">trigger-whatsapp-sender</td>
                  <td className="p-4 text-slate-300">Trigger auxiliar para chamar whatsapp-sender via HTTP</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">seed-appointments</td>
                  <td className="p-4 text-slate-300">Popula tabela appointments com dados de exemplo (desenvolvimento)</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-slate-400">test-whatsapp-message</td>
                  <td className="p-4 text-slate-300">Envia mensagem de teste via WhatsApp Cloud API</td>
                  <td className="p-4 text-slate-500">verify_jwt: false</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Arquitetura de Chamadas</h4>
            <p className="text-sm text-slate-400 mb-4">
              As Edge Functions se comunicam diretamente via <code className="text-cyan-400 bg-slate-950 px-2 py-1 rounded">fetch()</code> com autenticação via SERVICE_ROLE_KEY:
            </p>
            <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded border border-slate-700 overflow-x-auto">
{`// Exemplo de chamada entre funções
const response = await fetch(
  \`\${SUPABASE_URL}/functions/v1/nina-orchestrator\`,
  {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${SERVICE_ROLE_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messageId, conversationId })
  }
);`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 'database',
      title: '🗄️ Banco de Dados - Tabelas Principais',
      icon: Database,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              📊 Diagrama de Relacionamentos (ER)
            </h4>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
              <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre">
{`erDiagram
    contacts ||--o{ conversations : "tem"
    contacts ||--o{ deals : "gera"
    contacts ||--o{ appointments : "agenda"
    
    conversations ||--o{ messages : "contém"
    conversations ||--o| conversation_states : "possui"
    
    deals ||--o{ deal_activities : "registra"
    deals }o--|| pipeline_stages : "está em"
    deals }o--o| team_members : "atribuído a"
    
    teams ||--o{ team_members : "possui"
    team_functions ||--o{ team_members : "define"
    
    messages }o--|| message_processing_queue : "processa"
    messages }o--|| nina_processing_queue : "analisa"
    messages }o--|| send_queue : "envia"
    
    contacts {
        uuid id PK
        text phone_number UK
        text name
        text email
        jsonb client_memory
        text_array tags
        boolean is_blocked
    }
    
    conversations {
        uuid id PK
        uuid contact_id FK
        conversation_status status
        team_assignment assigned_team
        jsonb nina_context
    }
    
    messages {
        uuid id PK
        uuid conversation_id FK
        message_type type
        message_from from_type
        message_status status
        text content
    }
    
    deals {
        uuid id PK
        uuid contact_id FK
        uuid stage_id FK
        uuid owner_id FK
        text title
        numeric value
        text stage
    }`}
              </pre>
            </div>
            <p className="text-sm text-slate-400 mt-4 flex items-start gap-2">
              <span className="text-cyan-400">ℹ️</span>
              <span>
                Este diagrama mostra os principais relacionamentos do banco. Copie o código Mermaid acima 
                para visualizar em ferramentas como <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">mermaid.live</a>
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-cyan-400 font-bold mb-3 text-sm">contacts</h4>
              <p className="text-xs text-slate-400 mb-3">Armazena dados dos contatos/clientes</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• id, phone_number, name, email</li>
                <li>• tags[], client_memory (JSONB)</li>
                <li>• is_blocked, blocked_reason</li>
                <li>• first_contact_date, last_activity</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-emerald-400 font-bold mb-3 text-sm">conversations</h4>
              <p className="text-xs text-slate-400 mb-3">Gerencia conversas ativas</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• id, contact_id, status (nina/human/paused)</li>
                <li>• assigned_team, assigned_user_id</li>
                <li>• nina_context (JSONB)</li>
                <li>• last_message_at, is_active</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-violet-400 font-bold mb-3 text-sm">messages</h4>
              <p className="text-xs text-slate-400 mb-3">Histórico completo de mensagens</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• id, conversation_id, content</li>
                <li>• from_type (user/nina/human)</li>
                <li>• type (text/audio/image/document/video)</li>
                <li>• status (sent/delivered/read/failed)</li>
                <li>• whatsapp_message_id</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-amber-400 font-bold mb-3 text-sm">deals</h4>
              <p className="text-xs text-slate-400 mb-3">Oportunidades no pipeline CRM</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• id, title, value, stage_id</li>
                <li>• contact_id, owner_id</li>
                <li>• priority, tags[], notes</li>
                <li>• won_at, lost_at, lost_reason</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-pink-400 font-bold mb-3 text-sm">pipeline_stages</h4>
              <p className="text-xs text-slate-400 mb-3">Estágios customizáveis do funil</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• id, title, color, position</li>
                <li>• is_ai_managed (true/false)</li>
                <li>• ai_trigger_criteria (texto)</li>
                <li>• is_system, is_active</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-blue-400 font-bold mb-3 text-sm">appointments</h4>
              <p className="text-xs text-slate-400 mb-3">Agendamentos e reuniões</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• id, title, description</li>
                <li>• date, time, duration (minutos)</li>
                <li>• type (demo/meeting/support/followup)</li>
                <li>• contact_id, meeting_url</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-orange-400 font-bold mb-3 text-sm">nina_settings</h4>
              <p className="text-xs text-slate-400 mb-3">Configurações globais do agente IA</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• company_name, sdr_name</li>
                <li>• openai_model, openai_assistant_id</li>
                <li>• system_prompt_override</li>
                <li>• auto_response_enabled, ai_model_mode</li>
                <li>• business_hours, business_days</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h4 className="text-slate-400 font-bold mb-3 text-sm">team_members / teams</h4>
              <p className="text-xs text-slate-400 mb-3">Estrutura de equipe e funções</p>
              <ul className="text-xs text-slate-500 space-y-1 font-mono">
                <li>• teams: name, color, description</li>
                <li>• team_functions: name, description</li>
                <li>• team_members: name, email, role</li>
                <li>• status (active/invited/disabled)</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Filas de Processamento</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-cyan-400 font-mono text-xs">nina_processing_queue</span>
                <span className="text-slate-400 text-xs">→ Mensagens aguardando processamento pela IA</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-mono text-xs">send_queue</span>
                <span className="text-slate-400 text-xs">→ Mensagens aguardando envio via WhatsApp</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-violet-400 font-mono text-xs">message_processing_queue</span>
                <span className="text-slate-400 text-xs">→ Fila de mensagens brutas recebidas do webhook</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-400 font-mono text-xs">message_grouping_queue</span>
                <span className="text-slate-400 text-xs">→ Agrupamento temporário de mensagens do webhook</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Tabelas Adicionais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-700 rounded p-4">
                <h5 className="text-cyan-400 font-bold text-sm mb-2">conversation_states</h5>
                <p className="text-xs text-slate-400 mb-2">Estado de máquina para conversas</p>
                <ul className="text-xs text-slate-500 space-y-1 font-mono">
                  <li>• current_state (idle/active/scheduling)</li>
                  <li>• last_action, last_action_at</li>
                  <li>• scheduling_context (JSONB)</li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-4">
                <h5 className="text-emerald-400 font-bold text-sm mb-2">deal_activities</h5>
                <p className="text-xs text-slate-400 mb-2">Atividades vinculadas a deals</p>
                <ul className="text-xs text-slate-500 space-y-1 font-mono">
                  <li>• title, description, type</li>
                  <li>• scheduled_at, completed_at</li>
                  <li>• created_by (team_member)</li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-4">
                <h5 className="text-violet-400 font-bold text-sm mb-2">tag_definitions</h5>
                <p className="text-xs text-slate-400 mb-2">Definições de tags do sistema</p>
                <ul className="text-xs text-slate-500 space-y-1 font-mono">
                  <li>• key, label, color</li>
                  <li>• category (status/interest/action)</li>
                  <li>• is_active</li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-4">
                <h5 className="text-amber-400 font-bold text-sm mb-2">contacts_with_stats (VIEW)</h5>
                <p className="text-xs text-slate-400 mb-2">View com estatísticas agregadas</p>
                <ul className="text-xs text-slate-500 space-y-1 font-mono">
                  <li>• total_messages, nina_messages</li>
                  <li>• user_messages, human_messages</li>
                  <li>• Todos os campos de contacts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Database Functions (Stored Procedures)</h4>
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-cyan-400 font-mono text-xs mb-1">claim_nina_processing_batch(p_limit)</p>
                <p className="text-slate-400 text-xs">Atomicamente busca e marca mensagens como 'processing' na nina_processing_queue</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-emerald-400 font-mono text-xs mb-1">claim_send_queue_batch(p_limit)</p>
                <p className="text-slate-400 text-xs">Atomicamente busca e marca mensagens como 'processing' na send_queue</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-violet-400 font-mono text-xs mb-1">claim_message_processing_batch(p_limit)</p>
                <p className="text-slate-400 text-xs">Atomicamente busca e marca webhooks na message_processing_queue</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-amber-400 font-mono text-xs mb-1">get_or_create_conversation_state(p_conversation_id)</p>
                <p className="text-slate-400 text-xs">Retorna o estado da conversa ou cria um novo se não existir</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-pink-400 font-mono text-xs mb-1">update_conversation_state(p_conversation_id, p_new_state, ...)</p>
                <p className="text-slate-400 text-xs">Atualiza o estado da máquina de conversas com contexto e ação</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-blue-400 font-mono text-xs mb-1">update_client_memory(p_contact_id, p_new_memory)</p>
                <p className="text-slate-400 text-xs">Atualiza o JSONB client_memory de um contato</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-orange-400 font-mono text-xs mb-1">cleanup_processed_queues()</p>
                <p className="text-slate-400 text-xs">Remove registros antigos das filas de processamento (&gt;24h completed, &gt;7d failed)</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Database Triggers</h4>
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-cyan-400 font-bold text-xs mb-1">update_updated_at_column (8 tabelas)</p>
                <p className="text-slate-400 text-xs">Trigger <code className="text-slate-500">BEFORE UPDATE</code> que automaticamente atualiza <code>updated_at = now()</code></p>
                <p className="text-slate-500 text-xs mt-1">Tabelas: contacts, conversations, conversation_states, nina_processing_queue, message_processing_queue, send_queue, nina_settings, tag_definitions</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-emerald-400 font-bold text-xs mb-1">update_conversation_last_message</p>
                <p className="text-slate-400 text-xs">Trigger <code className="text-slate-500">AFTER INSERT</code> em messages que atualiza last_message_at nas conversations e last_activity nos contacts</p>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="text-violet-400 font-bold text-xs mb-1">create_deal_for_new_contact</p>
                <p className="text-slate-400 text-xs">Trigger <code className="text-slate-500">AFTER INSERT</code> em contacts que automaticamente cria um deal no estágio 'new'</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'enums',
      title: '🏷️ Database ENUMs',
      icon: Database,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Tipos Enumerados do PostgreSQL</h4>
            <p className="text-sm text-slate-400 mb-4">
              O sistema usa ENUMs nativos do PostgreSQL para garantir integridade de dados em campos específicos.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-cyan-400 font-bold mb-2 text-sm">appointment_type</h5>
                <p className="text-xs text-slate-400 mb-2">Tipo de compromisso agendado</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• demo</li>
                  <li>• meeting</li>
                  <li>• support</li>
                  <li>• followup</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-emerald-400 font-bold mb-2 text-sm">conversation_status</h5>
                <p className="text-xs text-slate-400 mb-2">Estado da conversa</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• nina (IA respondendo)</li>
                  <li>• human (agente humano)</li>
                  <li>• paused (pausada)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-violet-400 font-bold mb-2 text-sm">member_role</h5>
                <p className="text-xs text-slate-400 mb-2">Papel do membro da equipe</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• admin (administrador)</li>
                  <li>• manager (gerente)</li>
                  <li>• agent (agente)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-amber-400 font-bold mb-2 text-sm">member_status</h5>
                <p className="text-xs text-slate-400 mb-2">Status do membro</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• active (ativo)</li>
                  <li>• invited (convidado)</li>
                  <li>• disabled (desabilitado)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-pink-400 font-bold mb-2 text-sm">message_from</h5>
                <p className="text-xs text-slate-400 mb-2">Origem da mensagem</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• user (cliente)</li>
                  <li>• nina (IA)</li>
                  <li>• human (agente humano)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-blue-400 font-bold mb-2 text-sm">message_status</h5>
                <p className="text-xs text-slate-400 mb-2">Status de entrega da mensagem</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• sent (enviada)</li>
                  <li>• delivered (entregue)</li>
                  <li>• read (lida)</li>
                  <li>• failed (falhou)</li>
                  <li>• processing (processando)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-orange-400 font-bold mb-2 text-sm">message_type</h5>
                <p className="text-xs text-slate-400 mb-2">Tipo de mídia da mensagem</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• text (texto)</li>
                  <li>• audio (áudio)</li>
                  <li>• image (imagem)</li>
                  <li>• document (documento)</li>
                  <li>• video (vídeo)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-teal-400 font-bold mb-2 text-sm">queue_status</h5>
                <p className="text-xs text-slate-400 mb-2">Status de itens nas filas</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• pending (pendente)</li>
                  <li>• processing (processando)</li>
                  <li>• completed (completado)</li>
                  <li>• failed (falhou)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-rose-400 font-bold mb-2 text-sm">team_assignment</h5>
                <p className="text-xs text-slate-400 mb-2">Time de atendimento atribuído</p>
                <ul className="text-xs text-slate-300 space-y-1 font-mono">
                  <li>• mateus</li>
                  <li>• igor</li>
                  <li>• fe</li>
                  <li>• vendas</li>
                  <li>• suporte</li>
                </ul>
              </div>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-cyan-200 flex items-start gap-2">
                <span className="text-cyan-400 font-bold">💡</span>
                <span>
                  <strong>Por que usar ENUMs?</strong> ENUMs garantem que apenas valores válidos sejam inseridos no banco, 
                  prevenindo erros de digitação e mantendo consistência. São mais eficientes que strings livres e facilitam 
                  validação no TypeScript (src/integrations/supabase/types.ts).
                </span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'flows',
      title: '🔄 Fluxos Principais do Sistema',
      icon: GitBranch,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              1. Fluxo de Mensagem Recebida
            </h4>
            <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded border border-slate-700 overflow-x-auto leading-loose">
{`┌─────────────────────────────────────────────────────────────┐
│ Cliente envia mensagem via WhatsApp                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ [whatsapp-webhook] Edge Function                            │
│  • Valida webhook do WhatsApp Cloud API                     │
│  • Cria/atualiza contact no DB                              │
│  • Cria/atualiza conversation                               │
│  • Insere message na tabela messages                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Adiciona item à nina_processing_queue                       │
│  • priority = 1 (padrão)                                    │
│  • status = 'pending'                                       │
│  • context_data = { contact, conversation, message }        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ [nina-orchestrator] Edge Function (chamada via fetch)       │
│  • Busca context: contato + conversa + histórico           │
│  • Verifica se deve responder (auto_response_enabled)       │
│  • Processa templates dinâmicos ({{ data_hora }}, etc)     │
│  • Envia prompt ao Lovable AI Gateway                       │
│  • Recebe resposta da IA                                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Quebra resposta em chunks (se message_breaking_enabled)    │
│  • Split por \\n\\n (double newline)                         │
│  • Adiciona cada chunk à send_queue                         │
│  • scheduled_at com delays progressivos (~1.5s entre cada)  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ [whatsapp-sender] Edge Function (chamada via fetch)         │
│  • Processa send_queue em loop (até 25 segundos)           │
│  • Respeita scheduled_at de cada chunk                      │
│  • Envia via WhatsApp Cloud API                             │
│  • Salva whatsapp_message_id na tabela messages            │
│  • Atualiza status do item na fila: 'completed'            │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Cliente recebe mensagens no WhatsApp                        │
└─────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              2. Fluxo de Análise de Conversa
            </h4>
            <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded border border-slate-700 overflow-x-auto leading-loose">
{`┌─────────────────────────────────────────────────────────────┐
│ nina-orchestrator processa mensagem                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Verifica total de mensagens na conversa                     │
│  • Se mensagem 1, 5, 10, 15, 20... → Trigger análise       │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (EdgeRuntime.waitUntil - assíncrono)
┌─────────────────────────────────────────────────────────────┐
│ [analyze-conversation] Edge Function                        │
│  • Busca todas as mensagens da conversa                     │
│  • Monta prompt de análise com histórico completo          │
│  • Envia ao Lovable AI Gateway (Gemini 2.5 Flash)          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ IA retorna análise estruturada (JSON)                       │
│  • interests: array de interesses do cliente                │
│  • pain_points: array de dores identificadas                │
│  • qualification_score: 0-100                               │
│  • next_best_action: próxima ação recomendada               │
│  • budget_indication: low/medium/high/unknown               │
│  • decision_timeline: immediate/short/medium/long/unknown   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Atualiza contacts.client_memory (merge com dados anteriores)│
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Busca pipeline_stages com is_ai_managed = true              │
│ Monta prompt: "Qual estágio adequado para este deal?"      │
│ IA analisa e retorna: { suggestedStageId, confidence }     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Se confidence > 70% → Move deal automaticamente             │
│ Senão → Registra sugestão mas não move                     │
└─────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              3. Fluxo de Takeover Humano
            </h4>
            <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded border border-slate-700 overflow-x-auto leading-loose">
{`┌─────────────────────────────────────────────────────────────┐
│ Agente humano clica "Assumir Conversa" na interface        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend atualiza conversation.status = 'human'             │
│ (via supabase.from('conversations').update())              │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ nina-orchestrator detecta status = 'human'                  │
│  • Não adiciona item à nina_processing_queue                │
│  • IA para de responder automaticamente                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Agente responde manualmente via ChatInterface              │
│  • Mensagens têm from_type = 'human'                       │
│  • Adicionadas diretamente ao send_queue                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Quando resolver, agente clica "Reativar IA"                │
│ conversation.status = 'nina'                                │
│ IA volta a responder automaticamente                        │
└─────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 'hooks',
      title: '🧩 Hooks e Contextos',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Custom Hooks</h4>
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-cyan-400 font-bold mb-3">useConversations</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Hook central para gerenciar todas as conversas e mensagens com realtime subscriptions.
                </p>
                <div className="bg-slate-900 rounded p-3 mb-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Funcionalidades:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <code className="text-cyan-400">fetchConversations()</code> - Busca inicial de conversas</li>
                    <li>• <code className="text-cyan-400">sendMessage(conversationId, content)</code> - Envia mensagem com optimistic update</li>
                    <li>• <code className="text-cyan-400">updateStatus(conversationId, status)</code> - Alterna nina/human/paused</li>
                    <li>• <code className="text-cyan-400">markAsRead(conversationId)</code> - Marca mensagens como lidas</li>
                    <li>• <code className="text-cyan-400">assignConversation(conversationId, userId)</code> - Atribui a agente</li>
                  </ul>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Realtime Subscriptions:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>messages</strong> - INSERT/UPDATE → atualiza estado otimisticamente</li>
                    <li>• <strong>conversations</strong> - INSERT/UPDATE → refetch ou atualiza local</li>
                    <li>• Deduplicação por ID temporário (temp-{"{timestamp}"})</li>
                  </ul>
                </div>
                <div className="bg-slate-900 rounded p-3 mt-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Detalhes de Implementação:</p>
                  <pre className="text-xs text-slate-400 font-mono overflow-x-auto">
{`// 1. Cria channel com schema-db-changes
const messagesChannel = supabase.channel('messages-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    // Ignora se ID já existe (dedup)
    if (!conversations.some(msg => msg.id === payload.new.id)) {
      setConversations(prev => updateWithNewMessage(prev, payload.new));
    }
  })
  .subscribe();

// 2. Optimistic update ao enviar mensagem
const tempId = \`temp-\${Date.now()}\`;
setConversations(prev => addTempMessage(prev, tempId, content));

// 3. Após INSERT no DB, substitui temp ID pelo real
const { data } = await supabase.from('messages').insert(...);
setConversations(prev => replaceTempId(prev, tempId, data.id));

// 4. Realtime detecta INSERT → deduplicação ignora (ID real já existe)`}
                  </pre>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-emerald-400 font-bold mb-3">useCompanySettings</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Context Provider global que carrega e compartilha configurações de white-label (company_name, sdr_name).
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Valores Expostos:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <code className="text-emerald-400">companyName</code> - Nome da empresa (fallback: "Sua Empresa")</li>
                    <li>• <code className="text-emerald-400">sdrName</code> - Nome do agente IA (fallback: "Agente IA")</li>
                    <li>• <code className="text-emerald-400">loading</code> - Estado de carregamento</li>
                    <li>• <code className="text-emerald-400">refetch()</code> - Recarrega settings do banco</li>
                  </ul>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  💡 Usado em Sidebar, ChatInterface, Settings, PromptGenerator para branding dinâmico.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-violet-400 font-bold mb-3">useIsMobile</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Hook para detectar viewport mobile (breakpoint: 768px).
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
{`const isMobile = useIsMobile();

{isMobile ? (
  <MobileLayout />
) : (
  <DesktopLayout />
)}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'services',
      title: '🔧 Serviços e API',
      icon: Server,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">src/services/api.ts (1182 linhas)</h4>
            <p className="text-sm text-slate-400 mb-4">
              Camada de serviço centralizada que abstrai todas as operações CRUD com Supabase. 
              Todas as chamadas ao banco passam por este arquivo.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-cyan-400 font-bold mb-3 text-sm">Contacts API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchContacts()</li>
                  <li>• fetchContactById(id)</li>
                  <li>• updateContact(id, data)</li>
                  <li>• deleteContact(id)</li>
                  <li>• blockContact(id, reason)</li>
                  <li>• unblockContact(id)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-emerald-400 font-bold mb-3 text-sm">Conversations API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchConversations()</li>
                  <li>• fetchMessages(conversationId)</li>
                  <li>• sendMessage(conversationId, content)</li>
                  <li>• updateConversationStatus(id, status)</li>
                  <li>• assignConversation(id, userId)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-violet-400 font-bold mb-3 text-sm">Deals API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchDeals()</li>
                  <li>• createDeal(data)</li>
                  <li>• updateDeal(id, data)</li>
                  <li>• deleteDeal(id)</li>
                  <li>• moveDeal(id, stageId)</li>
                  <li>• markDealAsWon(id)</li>
                  <li>• markDealAsLost(id, reason)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-amber-400 font-bold mb-3 text-sm">Team API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchTeamMembers()</li>
                  <li>• fetchTeams()</li>
                  <li>• fetchTeamFunctions()</li>
                  <li>• createTeamMember(data)</li>
                  <li>• updateTeamMember(id, data)</li>
                  <li>• deleteTeamMember(id)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-pink-400 font-bold mb-3 text-sm">Appointments API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchAppointments(date)</li>
                  <li>• createAppointment(data)</li>
                  <li>• updateAppointment(id, data)</li>
                  <li>• deleteAppointment(id)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-blue-400 font-bold mb-3 text-sm">Settings API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchNinaSettings()</li>
                  <li>• updateNinaSettings(data)</li>
                  <li>• testWhatsAppMessage(phone, message)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-orange-400 font-bold mb-3 text-sm">Pipeline API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchPipelineStages()</li>
                  <li>• createPipelineStage(data)</li>
                  <li>• updatePipelineStage(id, data)</li>
                  <li>• deletePipelineStage(id)</li>
                  <li>• reorderPipelineStages(stages[])</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-teal-400 font-bold mb-3 text-sm">Tags API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchTagDefinitions()</li>
                  <li>• createTagDefinition(data)</li>
                  <li>• updateContactTags(contactId, tags[])</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-rose-400 font-bold mb-3 text-sm">Deal Activities API</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• fetchDealActivities(dealId)</li>
                  <li>• createDealActivity(dealId, data)</li>
                  <li>• updateDealActivity(id, data)</li>
                  <li>• deleteDealActivity(id)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-indigo-400 font-bold mb-3 text-sm">Métodos Extras</h5>
                <ul className="text-xs text-slate-400 space-y-1 font-mono">
                  <li>• updateContactNotes(contactId, notes)</li>
                  <li>• toggleContactBlock(contactId, blocked)</li>
                  <li>• markMessagesAsRead(conversationId)</li>
                  <li>• fetchConversationMessages(conversationId)</li>
                  <li>• fetchDashboardMetrics()</li>
                  <li>• fetchChartData(period)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'types',
      title: '📦 Tipos e Interfaces',
      icon: FileCode,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Tipos Principais (src/types.ts)</h4>
            
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-cyan-400 font-bold mb-3 text-sm">ClientMemory (JSONB)</h5>
                <p className="text-xs text-slate-400 mb-3">
                  Estrutura de memória contextual do cliente armazenada em <code className="text-cyan-400">contacts.client_memory</code>
                </p>
                <pre className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded overflow-x-auto">
{`interface ClientMemory {
  last_updated: string | null;
  conversation_history: Array<{
    date: string;
    summary: string;
  }>;
  lead_profile: {
    lead_stage: "new" | "qualified" | "engaged" | "hot";
    interests: string[];
    objections: string[];
    products_discussed: string[];
    communication_style: string;
    qualification_score: number; // 0-100
  };
  sales_intelligence: {
    pain_points: string[];
    budget_indication: "unknown" | "low" | "medium" | "high";
    decision_timeline: string;
    next_best_action: string;
  };
  interaction_summary: {
    total_conversations: number;
    last_contact_reason: string;
    response_pattern: string;
    preferred_contact_time: string;
  };
}`}
                </pre>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-emerald-400 font-bold mb-3 text-sm">Transformações DB ↔ UI</h5>
                <p className="text-xs text-slate-400 mb-3">
                  O sistema usa tipos diferentes para o banco (DBConversation/DBMessage) e para UI (UIConversation/UIMessage).
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Motivo:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>DB</strong>: Usa <code>contact_id</code> (UUID), <code>from_type</code> (enum)</li>
                    <li>• <strong>UI</strong>: Hydrata com objeto <code>contact: Contact</code> completo, agrupa mensagens</li>
                    <li>• Transforma timestamps em Date objects</li>
                    <li>• Calcula unreadCount no frontend</li>
                  </ul>
                </div>
                <pre className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded overflow-x-auto mt-3">
{`// useConversations.ts
const transformConversation = (dbConv: DBConversation): UIConversation => {
  return {
    ...dbConv,
    contact: { /* objeto Contact completo */ },
    messages: dbConv.messages.map(transformMessage),
    unreadCount: calculateUnread(dbConv.messages),
  };
};`}
                </pre>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-amber-400 font-bold mb-3 text-sm">Utility Functions (src/types.ts)</h5>
                <p className="text-xs text-slate-400 mb-3">
                  Funções auxiliares para transformação e formatação de dados.
                </p>
                <div className="space-y-2">
                  <div className="bg-slate-900 rounded p-3">
                    <p className="text-xs text-slate-300 font-mono mb-1">transformDBToUIConversation(dbConv, messages)</p>
                    <p className="text-xs text-slate-400">Converte DBConversation + DBMessage[] para UIConversation com hidratação de objetos</p>
                  </div>
                  <div className="bg-slate-900 rounded p-3">
                    <p className="text-xs text-slate-300 font-mono mb-1">transformDBToUIMessage(dbMsg)</p>
                    <p className="text-xs text-slate-400">Converte DBMessage para UIMessage, mapeia status/type/direction</p>
                  </div>
                  <div className="bg-slate-900 rounded p-3">
                    <p className="text-xs text-slate-300 font-mono mb-1">formatRelativeTime(date)</p>
                    <p className="text-xs text-slate-400">Formata data em texto relativo: "há 2 horas", "ontem", "há 3 dias"</p>
                  </div>
                  <div className="bg-slate-900 rounded p-3">
                    <p className="text-xs text-slate-300 font-mono mb-1">formatMessageTime(timestamp)</p>
                    <p className="text-xs text-slate-400">Formata timestamp para hora legível: "14:30"</p>
                  </div>
                  <div className="bg-slate-900 rounded p-3">
                    <p className="text-xs text-slate-300 font-mono mb-1">getDefaultClientMemory()</p>
                    <p className="text-xs text-slate-400">Factory que retorna estrutura ClientMemory inicial com valores default</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'advanced',
      title: '🚀 Funcionalidades Avançadas',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Sistemas Complexos Implementados</h4>
            
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-cyan-400 font-bold mb-3">1. Deduplicação de Mensagens</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Sistema de optimistic updates com IDs temporários para evitar duplicatas na UI.
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Fluxo:</p>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Usuário envia mensagem → cria <code className="text-cyan-400">temp-{"{timestamp}"}</code></li>
                    <li>Mensagem inserida no banco → retorna ID real</li>
                    <li>ID temporário é substituído pelo real no estado</li>
                    <li>Realtime subscription detecta INSERT → compara ID real</li>
                    <li>Se ID já existe, ignora (evita duplicata)</li>
                  </ol>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-emerald-400 font-bold mb-3">2. Message Chunking & Timing</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Respostas longas da IA são quebradas em múltiplas mensagens para simular digitação natural.
                </p>
                <div className="bg-slate-900 rounded p-3 mb-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Quando message_breaking_enabled = true:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Nina retorna resposta com delimitador <code className="text-emerald-400">\n\n</code></li>
                    <li>• whatsapp-sender split() por <code>\n\n</code></li>
                    <li>• Cada chunk vira uma mensagem separada na send_queue</li>
                    <li>• scheduled_at aumenta ~1.5s entre chunks</li>
                    <li>• whatsapp-sender processa em loop por 25s</li>
                  </ul>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-amber-300 mb-1">⚠️ Problema conhecido:</p>
                  <p className="text-xs text-slate-400">
                    Chunks órfãos na fila podem ser enviados com próximas respostas. 
                    Solução: Loop de 25s garante que chunks do mesmo contexto sejam processados juntos.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-violet-400 font-bold mb-3">3. Adaptive AI Mode</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Sistema que seleciona dinamicamente o modelo de IA baseado no contexto da conversa.
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Critérios de seleção (nina-orchestrator):</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>Usa gemini-2.5-pro se:</strong> conversa longa (&gt;10 msgs), urgente, técnica, objeções detectadas</li>
                    <li>• <strong>Usa gemini-2.5-flash se:</strong> conversa curta, saudações, confirmações simples</li>
                    <li>• Ajusta temperatura: 0.7 (pro) vs 0.8 (flash)</li>
                    <li>• Configurável via nina_settings.ai_model_mode = 'adaptive'</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-amber-400 font-bold mb-3">4. Template Variables no Prompt</h5>
                <p className="text-sm text-slate-400 mb-3">
                  System prompt suporta variáveis dinâmicas processadas em runtime.
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Variáveis disponíveis:</p>
                  <ul className="text-xs text-slate-400 space-y-1 font-mono">
                    <li>• <code className="text-amber-400">{"{{ data_hora }}"}</code> → "29/11/2024 14:30"</li>
                    <li>• <code className="text-amber-400">{"{{ data }}"}</code> → "29/11/2024"</li>
                    <li>• <code className="text-amber-400">{"{{ hora }}"}</code> → "14:30"</li>
                    <li>• <code className="text-amber-400">{"{{ dia_semana }}"}</code> → "Sexta-feira"</li>
                    <li>• <code className="text-amber-400">{"{{ cliente_nome }}"}</code> → Nome do contato</li>
                    <li>• <code className="text-amber-400">{"{{ cliente_telefone }}"}</code> → Telefone do contato</li>
                  </ul>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  💡 Processado por uma função template processor antes do envio à IA.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-pink-400 font-bold mb-3">5. Sincronização Conversa ↔ Deal</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Sistema bidirecional de sincronização entre conversas e pipeline de vendas.
                </p>
                <div className="bg-slate-900 rounded p-3 mb-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Automações:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Novo contato → trigger cria deal automático no estágio 'new'</li>
                    <li>• Atribuir conversa a agente → atribui deal ao mesmo agente</li>
                    <li>• Análise de conversa (a cada 5 msgs) → IA sugere novo estágio</li>
                    <li>• Se confidence &gt; 70% → move deal automaticamente</li>
                    <li>• ChatInterface mostra dados do deal na sidebar</li>
                    <li>• Modal de deal mostra últimas 15 mensagens da conversa</li>
                  </ul>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Nina Insights visíveis no deal:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• qualification_score (0-100)</li>
                    <li>• interests[], pain_points[]</li>
                    <li>• next_best_action</li>
                    <li>• budget_indication, decision_timeline</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h5 className="text-blue-400 font-bold mb-3">6. Pipeline Stages AI-Managed</h5>
                <p className="text-sm text-slate-400 mb-3">
                  Estágios podem ser configurados para movimentação automática por IA.
                </p>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-300 font-mono mb-2">Configuração:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <code className="text-blue-400">is_ai_managed: true</code> → IA pode mover para este estágio</li>
                    <li>• <code className="text-blue-400">ai_trigger_criteria: string</code> → Descrição de quando mover</li>
                    <li>• analyze-conversation consulta apenas estágios com criteria definida</li>
                    <li>• Estágios Manual → IA ignora, só humano pode mover</li>
                    <li>• Estágios system (won/lost) → protegidos contra delete</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'whitelabel',
      title: '🎨 Configuração White-Label',
      icon: Palette,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <p className="text-sm text-slate-400 mb-6">
              O sistema é 100% white-label. Todas as configurações abaixo podem ser editadas via interface, sem tocar no código:
            </p>

            <div className="space-y-6">
              <div>
                <h4 className="text-cyan-400 font-bold mb-3 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Identidade Visual
                </h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <div>
                        <span className="font-bold">Nome da Empresa:</span>{' '}
                        <span className="text-slate-400">Editável em Settings → Agente → Informações da Empresa</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <div>
                        <span className="font-bold">Nome do SDR/Agente:</span>{' '}
                        <span className="text-slate-400">Editável em Settings → Agente → Informações da Empresa</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <div>
                        <span className="font-bold">Uso no Sistema:</span>{' '}
                        <span className="text-slate-400">Sidebar, ChatInterface, Settings, status labels, prompts dinâmicos</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-emerald-400 font-bold mb-3 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Comportamento da IA
                </h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <div>
                        <span className="font-bold">System Prompt:</span>{' '}
                        <span className="text-slate-400">Editável manualmente ou gerar com IA (Gemini 3 Pro)</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <div>
                        <span className="font-bold">Modelo de IA:</span>{' '}
                        <span className="text-slate-400">Flash, Pro 2.5, Pro 3, ou Adaptive Mode</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <div>
                        <span className="font-bold">Horário Comercial:</span>{' '}
                        <span className="text-slate-400">Dias da semana + faixa de horário (ex: 09:00 - 18:00)</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <div>
                        <span className="font-bold">Timing:</span>{' '}
                        <span className="text-slate-400">Delays entre mensagens, quebra de texto em chunks</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-violet-400 font-bold mb-3 text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Integrações de API
                </h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400">•</span>
                      <div>
                        <span className="font-bold">WhatsApp Cloud API:</span>{' '}
                        <span className="text-slate-400">Access Token + Phone Number ID + Verify Token</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400">•</span>
                      <div>
                        <span className="font-bold">ElevenLabs (opcional):</span>{' '}
                        <span className="text-slate-400">API Key + Voice ID + configurações avançadas (stability, speed, style)</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400">•</span>
                      <div>
                        <span className="font-bold">Agendamento Nativo:</span>{' '}
                        <span className="text-slate-400">Integrado via Nina (create/reschedule/cancel appointment)</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-amber-400 font-bold mb-3 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Pipeline e CRM
                </h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <span className="font-bold">Estágios do Pipeline:</span>{' '}
                        <span className="text-slate-400">Criar/editar/reordenar/deletar estágios via modal de configuração</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <span className="font-bold">IA nos Estágios:</span>{' '}
                        <span className="text-slate-400">Marcar como Manual ou Automático + definir critérios de trigger</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <span className="font-bold">Tags de Contatos:</span>{' '}
                        <span className="text-slate-400">Criar tags customizadas com cores e categorias</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-pink-400 font-bold mb-3 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Gestão de Equipe
                </h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400">•</span>
                      <div>
                        <span className="font-bold">Times:</span>{' '}
                        <span className="text-slate-400">Criar/editar times com nome, descrição e cor</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400">•</span>
                      <div>
                        <span className="font-bold">Funções:</span>{' '}
                        <span className="text-slate-400">Criar/editar funções (ex: SDR, Closer, CS, Suporte)</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400">•</span>
                      <div>
                        <span className="font-bold">Membros:</span>{' '}
                        <span className="text-slate-400">Adicionar agentes com nome, email, função, time, peso de distribuição</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'secrets',
      title: '🔑 Variáveis de Ambiente e Secrets',
      icon: Key,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <p className="text-sm text-slate-400 mb-6">
              As credenciais são armazenadas em dois lugares:
            </p>

            <div className="space-y-6">
              <div>
                <h4 className="text-cyan-400 font-bold mb-3 text-sm">1. Variáveis de Ambiente (.env)</h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    <strong>⚠️ Gerenciadas automaticamente pelo Supabase/Lovable Cloud</strong> - Não editar manualmente:
                  </p>
                  <ul className="text-sm text-slate-300 space-y-2 font-mono">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <code className="text-xs">VITE_SUPABASE_URL</code>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <code className="text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <code className="text-xs">VITE_SUPABASE_PROJECT_ID</code>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-emerald-400 font-bold mb-3 text-sm">2. Credentials na Tabela (nina_settings)</h4>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    <strong>✅ Editáveis via Settings → APIs</strong>:
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-violet-400 mb-2">WhatsApp Cloud API (obrigatório)</p>
                      <ul className="text-sm text-slate-300 space-y-1 font-mono pl-4">
                        <li className="text-xs"><code>whatsapp_access_token</code></li>
                        <li className="text-xs"><code>whatsapp_phone_number_id</code></li>
                        <li className="text-xs"><code>whatsapp_verify_token</code> (padrão: webhook-verify-token)</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-amber-400 mb-2">ElevenLabs (opcional - text-to-speech)</p>
                      <ul className="text-sm text-slate-300 space-y-1 font-mono pl-4">
                        <li className="text-xs"><code>elevenlabs_api_key</code></li>
                        <li className="text-xs"><code>elevenlabs_voice_id</code></li>
                        <li className="text-xs"><code>elevenlabs_model</code></li>
                        <li className="text-xs"><code>elevenlabs_stability</code>, <code>elevenlabs_style</code>, etc.</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-pink-400 mb-2">Agendamento</p>
                      <ul className="text-sm text-slate-300 space-y-1 pl-4">
                        <li className="text-xs">✅ Agendamento é <strong>nativo</strong> via Nina (create/reschedule/cancel)</li>
                        <li className="text-xs">Dados salvos na tabela <code>appointments</code></li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-blue-400 mb-2">IA (Lovable AI Gateway)</p>
                      <ul className="text-sm text-slate-300 space-y-1 pl-4">
                        <li className="text-xs">✅ O sistema usa <strong>Lovable AI Gateway</strong> (Gemini/GPT)</li>
                        <li className="text-xs">Não requer API key própria da OpenAI</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
            <p className="text-sm text-amber-200 flex items-start gap-2">
              <span className="text-amber-400 font-bold">⚠️</span>
              <span>
                <strong>Importante:</strong> Nunca commitar credenciais no código. Todas as secrets devem estar em nina_settings 
                ou em variáveis de ambiente gerenciadas pelo Lovable/Supabase.
              </span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'howto',
      title: '📝 Como Modificar o Sistema',
      icon: FileCode,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h4 className="text-white font-bold mb-4">Guia de Modificações</h4>
            
            <div className="space-y-6">
              <div>
                <h5 className="text-cyan-400 font-bold mb-3 text-sm">1. Adicionar Nova Página</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                    <li>Criar componente em <code className="text-cyan-400">src/components/NovaPagina.tsx</code></li>
                    <li>Adicionar rota em <code className="text-cyan-400">src/App.tsx</code></li>
                    <li>Adicionar link na <code className="text-cyan-400">Sidebar.tsx</code></li>
                  </ol>
                  <pre className="text-xs text-slate-400 font-mono bg-slate-900 p-3 rounded mt-3 overflow-x-auto">
{`// App.tsx
<Route path="/nova-pagina" element={<NovaPagina />} />

// Sidebar.tsx
<Link to="/nova-pagina">
  <Icon className="w-5 h-5" />
  Nova Página
</Link>`}
                  </pre>
                </div>
              </div>

              <div>
                <h5 className="text-emerald-400 font-bold mb-3 text-sm">2. Adicionar Nova Edge Function</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                    <li>Criar pasta <code className="text-emerald-400">supabase/functions/minha-funcao/</code></li>
                    <li>Criar <code className="text-emerald-400">index.ts</code> dentro da pasta</li>
                    <li>Adicionar configuração em <code className="text-emerald-400">supabase/config.toml</code></li>
                    <li>Deploy automático ao commitar</li>
                  </ol>
                  <pre className="text-xs text-slate-400 font-mono bg-slate-900 p-3 rounded mt-3 overflow-x-auto">
{`// supabase/config.toml
[functions.minha-funcao]
verify_jwt = false  # ou true se precisa autenticação

// index.ts
Deno.serve(async (req) => {
  // Sua lógica aqui
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});`}
                  </pre>
                </div>
              </div>

              <div>
                <h5 className="text-violet-400 font-bold mb-3 text-sm">3. Modificar Comportamento da IA</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400">•</span>
                      <div>
                        <strong>Via Interface:</strong> Settings → Agente → Editar prompt manualmente ou gerar com IA
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400">•</span>
                      <div>
                        <strong>Via Código:</strong> Editar lógica de processamento em <code className="text-violet-400">nina-orchestrator/index.ts</code>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400">•</span>
                      <div>
                        <strong>Modelos Disponíveis:</strong> google/gemini-2.5-flash, google/gemini-2.5-pro, google/gemini-3-pro-preview, openai/gpt-5, openai/gpt-5-mini, openai/gpt-5-nano
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h5 className="text-amber-400 font-bold mb-3 text-sm">4. Adicionar Novo Estágio no Pipeline</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                    <li>Ir para <code className="text-amber-400">/kanban</code></li>
                    <li>Clicar em "Configurar" no canto superior direito</li>
                    <li>Clicar em "+ Adicionar Estágio"</li>
                    <li>Definir nome, cor, tipo (Manual/Automático)</li>
                    <li>Se Automático, adicionar critérios de trigger para IA</li>
                  </ol>
                  <p className="text-xs text-slate-400 mt-3">
                    💡 Estágios automáticos serão usados pela IA para mover deals quando os critérios forem detectados.
                  </p>
                </div>
              </div>

              <div>
                <h5 className="text-pink-400 font-bold mb-3 text-sm">5. Adicionar Nova Tabela no Banco</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                    <li>Criar migration SQL em <code className="text-pink-400">supabase/migrations/</code></li>
                    <li>Definir colunas, constraints, índices</li>
                    <li>Adicionar RLS policies para segurança</li>
                    <li>Criar triggers para <code>updated_at</code> se necessário</li>
                    <li>O arquivo <code className="text-pink-400">src/integrations/supabase/types.ts</code> será auto-gerado</li>
                  </ol>
                  <pre className="text-xs text-slate-400 font-mono bg-slate-900 p-3 rounded mt-3 overflow-x-auto">
{`CREATE TABLE public.minha_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- suas colunas
);

ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.minha_tabela
  FOR ALL USING (true) WITH CHECK (true);`}
                  </pre>
                </div>
              </div>

              <div>
                <h5 className="text-blue-400 font-bold mb-3 text-sm">6. Customizar Cores e Tema</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <div>
                        <strong>Cores Principais:</strong> Editar <code className="text-blue-400">src/index.css</code> (variáveis HSL)
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <div>
                        <strong>Tailwind Config:</strong> Editar <code className="text-blue-400">tailwind.config.ts</code> para novos tokens
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <div>
                        <strong>Componentes UI:</strong> Editar <code className="text-blue-400">src/components/ui/*</code> (shadcn variants)
                      </div>
                    </li>
                  </ul>
                  <p className="text-xs text-slate-400 mt-3">
                    💡 Todas as cores devem usar <strong>semantic tokens</strong> (--primary, --background, etc.) para manter consistência.
                  </p>
                </div>
              </div>

              <div>
                <h5 className="text-purple-400 font-bold mb-3 text-sm">7. Mock Data e Desenvolvimento</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-3">
                    O sistema possui dados mock em <code className="text-purple-400">src/constants.ts</code> para desenvolvimento e testes.
                  </p>
                  <div className="bg-slate-900 rounded p-3 mb-3">
                    <p className="text-xs text-slate-300 font-mono mb-2">Conjuntos de mock data disponíveis:</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• <code className="text-purple-400">MOCK_TEAM</code> - Membros da equipe</li>
                      <li>• <code className="text-purple-400">MOCK_CONTACTS</code> - Contatos de exemplo</li>
                      <li>• <code className="text-purple-400">MOCK_CONVERSATIONS</code> - Conversas simuladas</li>
                      <li>• <code className="text-purple-400">MOCK_APPOINTMENTS</code> - Compromissos de exemplo</li>
                      <li>• <code className="text-purple-400">MOCK_DEALS</code> - Deals para o pipeline</li>
                      <li>• <code className="text-purple-400">MOCK_BACKEND_FUNCTIONS</code> - Edge functions simuladas</li>
                    </ul>
                  </div>
                  <div className="bg-slate-900 rounded p-3">
                    <p className="text-xs text-amber-300 mb-2">⚠️ Quando usar mocks:</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Durante desenvolvimento local sem banco configurado</li>
                      <li>• Para testes de interface antes de conectar APIs</li>
                      <li>• Como fallback quando banco está vazio (UX melhor)</li>
                    </ul>
                  </div>
                  <div className="bg-slate-900 rounded p-3 mt-3">
                    <p className="text-xs text-emerald-300 mb-2">✅ Para produção:</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Remover ou desabilitar mocks em <code>src/services/api.ts</code></li>
                      <li>• Garantir que todas as queries retornam dados reais do Supabase</li>
                      <li>• Testar comportamento com banco vazio (empty states)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-indigo-400 font-bold mb-3 text-sm">8. Customizar Navegação (Sidebar)</h5>
                <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-300 mb-3">
                    Para adicionar, remover ou reordenar itens do menu lateral, edite o array <code className="text-indigo-400">menuItems</code> em <code className="text-indigo-400">src/components/Sidebar.tsx</code>:
                  </p>
                  
                  <div className="bg-slate-900 rounded-lg p-4 mb-4">
                    <pre className="text-xs text-slate-300 overflow-x-auto">
{`const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'kanban', label: 'Pipeline', icon: Kanban },
  { id: 'contacts', label: 'Contatos', icon: Users },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'scheduling', label: 'Agenda', icon: Calendar },
  { id: 'team', label: 'Time', icon: Users },
  { id: 'functions', label: 'Backend', icon: Code },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

// Para adicionar um novo item:
// 1. Importe o ícone do Lucide: 
//    import { NovoIcon } from 'lucide-react';
// 2. Adicione ao array: 
//    { id: 'nova-rota', label: 'Novo Item', icon: NovoIcon }
// 3. Crie a rota correspondente no App.tsx
// 4. Crie o componente da página em src/components/`}
                    </pre>
                  </div>

                  <p className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-indigo-400">ℹ️</span>
                    <span>
                      O <code className="text-indigo-400">id</code> deve corresponder à rota definida no React Router. 
                      O item ativo é automaticamente destacado com <code className="text-indigo-400">bg-cyan-500/10</code>.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4">
            <p className="text-sm text-cyan-200 flex items-start gap-2">
              <span className="text-cyan-400 font-bold">💡</span>
              <span>
                <strong>Dica:</strong> Para modificações avançadas, consulte a documentação do Supabase (<a href="https://supabase.com/docs" className="underline">supabase.com/docs</a>) 
                e do React (<a href="https://react.dev" className="underline">react.dev</a>). O código é 100% open-source e pode ser customizado livremente.
              </span>
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
        <p className="text-slate-300 text-sm leading-relaxed">
          Esta documentação foi criada para ajudar você a entender a arquitetura completa do sistema. 
          Como este é um projeto <strong className="text-cyan-400">white-label</strong>, todas as funcionalidades 
          podem ser customizadas através da interface ou editando o código diretamente.
        </p>
        <p className="text-slate-400 text-xs mt-3">
          💡 Clique nas seções abaixo para expandir e ver detalhes.
        </p>
      </div>

      {sections.map((section) => {
        const isExpanded = expandedSections.includes(section.id);
        const Icon = section.icon;

        return (
          <div
            key={section.id}
            className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-900/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white text-left">{section.title}</h3>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {isExpanded && (
              <div className="p-6 pt-0 border-t border-slate-800/50 animate-in fade-in duration-200">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SystemRoadmap;
