package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Random;

@Component("AI_ROUTER_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class AiRouterNodeExecutor implements NodeExecutor {

    private final WhatsAppService whatsappService;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        List<String> intents = null;
        if (config != null && config.containsKey("intents")) {
            intents = (List<String>) config.get("intents");
        }
        
        log.info("Executing AI_ROUTER node for user: {}. Configured Intents: {}", session.getUserId(), intents);
        
        // In a real implementation, we would call an NLP model (OpenAI, Dialogflow) here with the user's last message.
        // For now, we simulate detecting an intent.
        String detectedIntent = "fallback";
        if (intents != null && !intents.isEmpty()) {
             detectedIntent = intents.get(new Random().nextInt(intents.size()));
        }
        
        log.info("AI NLP Classified Intent as: [{}]", detectedIntent);
        
        session.getVariables().put("_last_branch_handle", detectedIntent);
        return NodeResult.next(null); 
    }
}
