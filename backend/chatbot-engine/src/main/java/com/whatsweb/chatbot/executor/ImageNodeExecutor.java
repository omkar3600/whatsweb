package com.whatsweb.chatbot.executor;

import com.whatsweb.chatbot.model.RFNode;
import com.whatsweb.chatbot.model.UserSession;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("IMAGE_EXECUTOR")
@RequiredArgsConstructor
public class ImageNodeExecutor implements NodeExecutor {
    private final MessageNodeExecutor messageExecutor;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        return messageExecutor.execute(node, session);
    }
}
