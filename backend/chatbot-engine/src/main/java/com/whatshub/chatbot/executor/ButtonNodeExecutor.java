package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("BUTTON_EXECUTOR")
@RequiredArgsConstructor
public class ButtonNodeExecutor implements NodeExecutor {
    private final WhatsAppService whatsappService;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        String text = node.getData().getContent();
        java.util.List<String> buttons = new java.util.ArrayList<>();
        if (node.getData().getConfig() != null && node.getData().getConfig().containsKey("buttons")) {
            Object btnObj = node.getData().getConfig().get("buttons");
            if (btnObj instanceof java.util.List) {
                for (Object b : (java.util.List) btnObj) {
                    if (b instanceof java.util.Map) {
                        buttons.add((String) ((java.util.Map) b).get("text"));
                    }
                }
            }
        }
        whatsappService.sendButtons(session.getUserId(), text, buttons);
        return NodeResult.waitInput();
    }
}
