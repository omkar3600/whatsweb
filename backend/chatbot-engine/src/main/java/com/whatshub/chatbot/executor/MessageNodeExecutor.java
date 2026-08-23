package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import com.whatshub.chatbot.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("TEXT_EXECUTOR")
@RequiredArgsConstructor
public class MessageNodeExecutor implements NodeExecutor {
    private final WhatsAppService whatsappService;
    private final VariableResolver variableResolver;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        String type = node.getData().getType();
        String content = node.getData().getContent();
        
        if ("IMAGE".equals(type) || "VIDEO".equals(type) || "DOCUMENT".equals(type)) {
            String url = "";
            String caption = "";
            if (node.getData().getConfig() != null) {
                url = (String) node.getData().getConfig().getOrDefault("imageUrl", 
                             node.getData().getConfig().getOrDefault("videoUrl", 
                             node.getData().getConfig().getOrDefault("documentUrl", "")));
                caption = (String) node.getData().getConfig().getOrDefault("caption", "");
            }
            content = (caption == null || caption.isEmpty() ? "" : caption + "\n") + url;
        }

        if (content == null || content.trim().isEmpty()) {
             return NodeResult.next(null);
        }

        String resolvedContent = variableResolver.resolve(content, session.getVariables());
        whatsappService.sendMessage(session.getUserId(), resolvedContent);
        return NodeResult.next(null);
    }
}
