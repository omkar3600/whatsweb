package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.WhatsAppService;
import com.whatshub.chatbot.service.VariableResolver;
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
