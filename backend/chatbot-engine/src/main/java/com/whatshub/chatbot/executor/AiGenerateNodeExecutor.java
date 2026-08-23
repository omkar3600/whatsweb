package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.VariableResolver;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("AI_GENERATE_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class AiGenerateNodeExecutor implements NodeExecutor {

    private final WhatsAppService whatsappService;
    private final VariableResolver variableResolver;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        String prompt = config != null && config.containsKey("prompt") 
                ? config.get("prompt").toString() 
                : "You are a helpful assistant.";
                
        String resolvedPrompt = variableResolver.resolve(prompt, session.getVariables());
        String model = config != null && config.containsKey("model") ? config.get("model").toString() : "gpt-3.5-turbo";
        
        log.info("Executing AI_GENERATE node for user: {}. Model: {}", session.getUserId(), model);
        
        // Simulate LLM Generation
        String generatedContent = "🤖 [AI Generated via " + model + "]\nBased on your prompt: '" + resolvedPrompt + "'. I can help you with that!";
        
        // Save to variable if configured
        if (config != null && config.containsKey("saveAs") && !config.get("saveAs").toString().isEmpty()) {
            session.getVariables().put(config.get("saveAs").toString(), generatedContent);
            log.info("Saved AI response to variable: {}", config.get("saveAs"));
        }
        
        // Send directly to WhatsApp
        whatsappService.sendMessage(session.getUserId(), generatedContent);
        
        return NodeResult.next(null);
    }
}
