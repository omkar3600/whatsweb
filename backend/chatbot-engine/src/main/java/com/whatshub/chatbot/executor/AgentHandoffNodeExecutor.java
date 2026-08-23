package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("AGENT_HANDOFF_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class AgentHandoffNodeExecutor implements NodeExecutor {

    private final WhatsAppService whatsappService;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        String message = config != null && config.containsKey("message") 
                ? config.get("message").toString() 
                : "User requested human agent assistance.";
        String department = config != null && config.containsKey("department") 
                ? config.get("department").toString() 
                : "support";
        boolean pauseBot = config == null || !config.containsKey("pauseBot") || Boolean.parseBoolean(config.get("pauseBot").toString());
        
        log.info("Executing AGENT_HANDOFF node for user: {}. Routing to: {}", session.getUserId(), department);
        
        whatsappService.routeToAgent(session.getUserId(), department, message);
        
        if (pauseBot) {
            // Setting a special state in the session to freeze bot replies
            session.getVariables().put("bot_paused", "true");
        }
        
        // Flow stops here entirely. It's now manual.
        return NodeResult.waitInput();
    }
}
