package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("FORM_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class FormNodeExecutor implements NodeExecutor {

    private final WhatsAppService whatsappService;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        String formTitle = config != null && config.containsKey("formTitle") 
                ? config.get("formTitle").toString() 
                : "Please fill out this form";
        
        log.info("Executing FORM node for user: {}. Form Title: {}", session.getUserId(), formTitle);
        
        // Native WhatsApp forms are sent via specialized API structures. 
        // Here we simulate the dispatch.
        whatsappService.sendForm(session.getUserId(), formTitle, config);
        
        // Forms typically pause the flow until the user submits the payload
        return NodeResult.waitInput();
    }
}
