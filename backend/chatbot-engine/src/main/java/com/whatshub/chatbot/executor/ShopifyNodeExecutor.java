package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;

@Component("SHOPIFY_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class ShopifyNodeExecutor implements NodeExecutor {
    private final RestTemplate restTemplate;
    private final VariableResolver variableResolver;
    private final ObjectMapper objectMapper;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        if (config == null) return NodeResult.next(null);

        String storeName = (String) config.get("storeName");
        String accessToken = (String) config.get("accessToken");
        String action = (String) config.getOrDefault("action", "check_order");
        String saveAs = (String) config.get("saveAs");

        if (storeName == null || accessToken == null) {
            log.warn("Shopify node missing store name or access token.");
            return NodeResult.next(null);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Shopify-Access-Token", accessToken);
            headers.set("Content-Type", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = "";
            
            if ("check_order".equals(action)) {
                String rawOrderId = (String) config.getOrDefault("orderId", "");
                String orderId = variableResolver.resolve(rawOrderId, session.getVariables());
                // Simulated clean ID logic (Shopify expects numeric ID)
                String numericId = orderId.replaceAll("[^0-9]", "");
                url = String.format("https://%s/admin/api/2024-01/orders/%s.json", storeName, numericId);
            } else if ("get_customer".equals(action)) {
                String rawEmail = (String) config.getOrDefault("customerEmail", "");
                String email = variableResolver.resolve(rawEmail, session.getVariables());
                url = String.format("https://%s/admin/api/2024-01/customers/search.json?query=email:%s", storeName, email);
            } else if ("check_inventory".equals(action)) {
                String rawProductId = (String) config.getOrDefault("productId", "");
                String productId = variableResolver.resolve(rawProductId, session.getVariables());
                String numericId = productId.replaceAll("[^0-9]", "");
                url = String.format("https://%s/admin/api/2024-01/products/%s.json", storeName, numericId);
            } else {
                return NodeResult.next(null);
            }

            log.info("Executing Native Shopify Action [{}] to URL: {}", action, url);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            Map<String, Object> responseMap = objectMapper.readValue(response.getBody(), Map.class);
            
            if (saveAs != null && !saveAs.isEmpty()) {
                String mappedJson = objectMapper.writeValueAsString(responseMap);
                session.getVariables().put(saveAs, mappedJson);
                log.info("Saved Shopify native response to variable: {}", saveAs);
            }

        } catch (Exception e) {
            log.error("Shopify native integration failed: {}", e.getMessage());
            if (saveAs != null && !saveAs.isEmpty()) {
                session.getVariables().put(saveAs, "{\"error\": \"Failed to connect to Shopify\"}");
            }
        }

        return NodeResult.next(null);
    }
}
