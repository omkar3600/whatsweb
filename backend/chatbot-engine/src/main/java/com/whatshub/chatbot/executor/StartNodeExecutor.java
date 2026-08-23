package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("START_EXECUTOR")
@RequiredArgsConstructor
public class StartNodeExecutor implements NodeExecutor {
    private final MessageNodeExecutor messageExecutor;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        return messageExecutor.execute(node, session);
    }
}
