package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("DELAY_EXECUTOR")
@RequiredArgsConstructor
public class DelayNodeExecutor implements NodeExecutor {

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        // In simulation, we don't actually wait for hours/days.
        // We just move to the next node instantly for a smooth preview.
        return NodeResult.next(null);
    }
}
