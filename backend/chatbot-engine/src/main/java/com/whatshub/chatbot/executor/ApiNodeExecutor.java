package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component("API_EXECUTOR")
@RequiredArgsConstructor
public class ApiNodeExecutor implements NodeExecutor {
    private final RestTemplate restTemplate;
    private final VariableResolver variableResolver;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        // In AiSensy, API details are usually in node.data.config
        Map<String, Object> config = node.getData().getConfig();
        String url = variableResolver.resolve((String) config.getOrDefault("url", ""), session.getVariables());
        
        try {
            // Simplified API call for demonstration
            Object response = restTemplate.getForObject(url, Object.class);
            // Dynamic variable mapping could be added here
            return NodeResult.next(null);
        } catch (Exception e) {
            return NodeResult.next(null); // Fallback or error handled by FlowEngine next node
        }
    }
}
