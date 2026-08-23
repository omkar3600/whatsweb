package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("CONDITION_EXECUTOR")
@RequiredArgsConstructor
public class ConditionNodeExecutor implements NodeExecutor {

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        String variable = (String) node.getData().getConfig().getOrDefault("variable", "{{user_response}}");
        String expected = (String) node.getData().getConfig().getOrDefault("expected", "");
        String conditionType = (String) node.getData().getConfig().getOrDefault("conditionType", "keyword");

        String actualValue = (String) session.getVariables().getOrDefault("user_response", "");

        boolean match = false;
        if ("keyword".equals(conditionType)) {
            match = actualValue.equalsIgnoreCase(expected);
        } else if ("contains".equals(conditionType)) {
            match = actualValue.toLowerCase().contains(expected.toLowerCase());
        }

        return NodeResult.next(match ? "yes" : "no");
    }
}
