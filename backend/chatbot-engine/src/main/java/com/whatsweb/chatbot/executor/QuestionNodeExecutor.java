package com.whatsweb.chatbot.executor;

import com.whatsweb.chatbot.model.RFNode;
import com.whatsweb.chatbot.model.UserSession;
import com.whatsweb.chatbot.service.WhatsAppService;
import com.whatsweb.chatbot.service.VariableResolver;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("QUESTION_EXECUTOR")
@RequiredArgsConstructor
public class QuestionNodeExecutor implements NodeExecutor {
    private final WhatsAppService whatsappService;
    private final VariableResolver variableResolver;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        String content = node.getData().getContent();
        String resolvedContent = variableResolver.resolve(content, session.getVariables());
        whatsappService.sendMessage(session.getUserId(), resolvedContent);
        return NodeResult.waitInput();
    }
}
