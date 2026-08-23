package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("WEBVIEW_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class WebviewNodeExecutor implements NodeExecutor {

    private final WhatsAppService whatsappService;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        String buttonText = config != null && config.containsKey("buttonText") 
                ? config.get("buttonText").toString() 
                : "Open Webview";
        String url = config != null && config.containsKey("url") 
                ? config.get("url").toString() 
                : "https://example.com";
        
        log.info("Executing WEBVIEW node for user: {}. URL: {}", session.getUserId(), url);
        
        whatsappService.sendWebview(session.getUserId(), buttonText, url);
        
        // Webviews usually don't pause the flow unless a response is expected from the webview JS bridging.
        // For standard flow progression, we just move to the next node.
        return NodeResult.next(null);
    }
}
