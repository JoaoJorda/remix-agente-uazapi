import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { contact_id, conversation_id, user_message, ai_response, current_memory, user_id } = await req.json();

    console.log(`[Analyze Conversation] Starting analysis for contact ${contact_id}`);

    // Calculate interaction count
    const interactionCount = (current_memory.interaction_summary?.total_conversations || 0) + 1;
    
    // Determine if full AI analysis should run (message 1, 5, 10, 15, 20...)
    const shouldAnalyze = interactionCount === 1 || interactionCount % 5 === 0;
    
    console.log(`[Analyze] Interaction #${interactionCount}, full analysis: ${shouldAnalyze}`);

    if (!shouldAnalyze) {
      // BASIC UPDATE: Just increment counter and add to history
      const basicMemory = {
        ...current_memory,
        last_updated: new Date().toISOString(),
        interaction_summary: {
          ...current_memory.interaction_summary,
          total_conversations: interactionCount,
          last_contact_reason: user_message?.substring(0, 100) || ''
        },
        conversation_history: [
          ...(current_memory.conversation_history || []).slice(-9),
          {
            timestamp: new Date().toISOString(),
            user_summary: user_message?.substring(0, 200),
            ai_action: ai_response?.substring(0, 200)
          }
        ]
      };
      
      await supabase.rpc('update_client_memory', {
        p_contact_id: contact_id,
        p_new_memory: basicMemory
      });
      
      console.log('[Analyze] Basic update completed');
      return new Response(JSON.stringify({ updated: true, type: 'basic' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // FULL ANALYSIS: Fetch pipeline stages and current deal
    // Only fetch AI-managed stages with criteria (single-tenant - no user_id filter)
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, title, ai_trigger_criteria, position')
      .eq('is_ai_managed', true)
      .not('ai_trigger_criteria', 'is', null)
      .eq('is_active', true)
      .order('position', { ascending: true });

    const { data: currentDeal } = await supabase
      .from('deals')
      .select('id, stage_id, stage')
      .eq('contact_id', contact_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasAiManagedStages = stages && stages.length > 0;
    
    if (!hasAiManagedStages) {
      console.log('[Analyze] ⏭️ No AI-managed stages with criteria - skipping stage determination');
    }

    console.log(`[Analyze] Running full AI analysis${hasAiManagedStages ? ' with stage determination' : ' (insights only)'}...`);

    // Prepare stage criteria for AI (only if there are AI-managed stages)
    const stagesCriteria = hasAiManagedStages
      ? stages.map(s => `- ${s.title} (ID: ${s.id}): ${s.ai_trigger_criteria}`).join('\n')
      : '';

    // Prepare conversation snippet for AI analysis
    const conversationSnippet = `
MENSAGEM DO CLIENTE:
${user_message}

RESPOSTA DO ASSISTENTE:
${ai_response}

CONTEXTO ATUAL:
- Interesses conhecidos: ${current_memory.lead_profile?.interests?.join(', ') || 'Nenhum'}
- Dores identificadas: ${current_memory.sales_intelligence?.pain_points?.join(', ') || 'Nenhuma'}
- Score atual: ${current_memory.lead_profile?.qualification_score || 0}/100
${hasAiManagedStages ? `
CRITÉRIOS DOS ESTÁGIOS DO PIPELINE:
${stagesCriteria}

ESTÁGIO ATUAL DO DEAL: ${currentDeal?.stage || 'Sem estágio'}` : ''}
    `.trim();

    // Build tools array - always include memory insights, conditionally include stage determination
    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "update_memory_insights",
          description: "Extrair insights estruturados da conversa para atualizar memória do cliente",
          parameters: {
            type: "object",
            properties: {
              interests: {
                type: "array",
                items: { type: "string" },
                description: "Lista de interesses ou necessidades mencionados pelo cliente (max 5)"
              },
              pain_points: {
                type: "array",
                items: { type: "string" },
                description: "Dores, problemas ou desafios mencionados (max 5)"
              },
              qualification_score: {
                type: "number",
                description: "Score de qualificação de 0 a 100 baseado em: interesse demonstrado, budget implícito, urgência, fit com produto",
                minimum: 0,
                maximum: 100
              },
              next_best_action: {
                type: "string",
                enum: ["qualify", "demo", "followup", "close", "nurture"],
                description: "Próxima melhor ação"
              },
              budget_indication: {
                type: "string",
                enum: ["unknown", "low", "medium", "high"],
                description: "Indicação de orçamento baseado em sinais implícitos"
              },
              decision_timeline: {
                type: "string",
                enum: ["unknown", "immediate", "1month", "3months", "6months+"],
                description: "Timeline de decisão baseado em urgência"
              }
            },
            required: ["interests", "pain_points", "qualification_score", "next_best_action", "budget_indication", "decision_timeline"],
            additionalProperties: false
          }
        }
      }
    ];

    // Only add stage determination tool if there are AI-managed stages
    if (hasAiManagedStages) {
      tools.push({
        type: "function",
        function: {
          name: "determine_deal_stage",
          description: "Determinar para qual estágio do pipeline o deal deve ir com base nos critérios",
          parameters: {
            type: "object",
            properties: {
              suggested_stage_id: {
                type: "string",
                enum: stages.map(s => s.id),
                description: "ID do estágio sugerido"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 100,
                description: "Confiança na sugestão (0-100)"
              },
              reasoning: {
                type: "string",
                description: "Justificativa breve para a mudança (max 200 chars)"
              }
            },
            required: ["suggested_stage_id", "confidence", "reasoning"],
            additionalProperties: false
          }
        }
      });
    }

    const systemPrompt = hasAiManagedStages 
      ? `Você é um analista de conversas de vendas. Analise a interação e:
1. Extraia insights estruturados para atualizar a memória do cliente
2. Determine para qual estágio do pipeline o deal deve ir com base nos critérios fornecidos`
      : `Você é um analista de conversas de vendas. Analise a interação e extraia insights estruturados para atualizar a memória do cliente.`;

    // Call AI to extract insights AND determine deal stage (if applicable)
    const analysisResponse = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversationSnippet }
        ],
        tools: tools
      })
    });

    if (!analysisResponse.ok) {
      console.error('[Analyze] AI analysis failed:', analysisResponse.status);
      throw new Error('AI analysis failed');
    }

    const analysisData = await analysisResponse.json();
    const toolCalls = analysisData.choices?.[0]?.message?.tool_calls || [];
    
    if (toolCalls.length === 0) {
      console.error('[Analyze] No tool calls in AI response');
      throw new Error('No insights extracted');
    }

    // Extract insights from tool calls
    let insights = null;
    let stageResult = null;

    for (const toolCall of toolCalls) {
      if (toolCall.function?.name === 'update_memory_insights') {
        insights = JSON.parse(toolCall.function.arguments);
      } else if (toolCall.function?.name === 'determine_deal_stage') {
        stageResult = JSON.parse(toolCall.function.arguments);
      }
    }

    console.log('[Analyze] Insights extracted:', insights);
    console.log('[Analyze] Stage suggestion:', stageResult);

    // Update client memory with insights
    if (insights) {
      const updatedMemory = {
        ...current_memory,
        last_updated: new Date().toISOString(),
        lead_profile: {
          ...current_memory.lead_profile,
          interests: Array.from(new Set([
            ...(current_memory.lead_profile?.interests || []),
            ...insights.interests
          ])).slice(0, 10),
          qualification_score: insights.qualification_score,
          lead_stage: insights.qualification_score > 70 ? 'qualified' : 
                      insights.qualification_score > 40 ? 'engaged' : 'new',
          budget_indication: insights.budget_indication,
          decision_timeline: insights.decision_timeline
        },
        sales_intelligence: {
          ...current_memory.sales_intelligence,
          pain_points: Array.from(new Set([
            ...(current_memory.sales_intelligence?.pain_points || []),
            ...insights.pain_points
          ])).slice(0, 10),
          next_best_action: insights.next_best_action
        },
        interaction_summary: {
          ...current_memory.interaction_summary,
          total_conversations: interactionCount,
          last_contact_reason: user_message?.substring(0, 100) || ''
        },
        conversation_history: [
          ...(current_memory.conversation_history || []).slice(-9),
          {
            timestamp: new Date().toISOString(),
            user_summary: user_message?.substring(0, 200),
            ai_action: ai_response?.substring(0, 200),
            insights_extracted: {
              qualification_score: insights.qualification_score,
              next_action: insights.next_best_action
            }
          }
        ]
      };

      await supabase.rpc('update_client_memory', {
        p_contact_id: contact_id,
        p_new_memory: updatedMemory
      });

      console.log('[Analyze] Memory updated successfully');
    }

    // Move deal if confidence > 70% and stage is different
    let dealMoved = false;
    if (stageResult && currentDeal && stageResult.suggested_stage_id !== currentDeal.stage_id && stageResult.confidence > 70) {
      const newStage = stages?.find(s => s.id === stageResult.suggested_stage_id);
      
      if (newStage) {
        const { error: updateError } = await supabase
          .from('deals')
          .update({ 
            stage_id: stageResult.suggested_stage_id,
            stage: newStage.title
          })
          .eq('id', currentDeal.id);

        if (!updateError) {
          dealMoved = true;
          console.log(`[Analyze] Deal moved to stage: ${newStage.title} (confidence: ${stageResult.confidence}%)`);
          console.log(`[Analyze] Reasoning: ${stageResult.reasoning}`);
        } else {
          console.error('[Analyze] Error moving deal:', updateError);
        }
      }
    } else if (stageResult && currentDeal) {
      console.log(`[Analyze] Deal NOT moved: same stage or low confidence (${stageResult.confidence}%)`);
    }

    return new Response(JSON.stringify({ 
      updated: true, 
      type: 'full',
      insights,
      stage_result: stageResult,
      deal_moved: dealMoved
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Analyze] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
