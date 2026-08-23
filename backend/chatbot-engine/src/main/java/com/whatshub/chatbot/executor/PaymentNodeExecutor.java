package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.VariableResolver;
import com.whatshub.chatbot.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("PAYMENT_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class PaymentNodeExecutor implements NodeExecutor {

    private final WhatsAppService whatsappService;
    private final VariableResolver variableResolver;

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        String amount = "0.00";
        String currency = "INR";
        String referenceId = "REF-" + System.currentTimeMillis();
        
        if (config != null) {
            if (config.containsKey("amount")) amount = config.get("amount").toString();
            if (config.containsKey("currency")) currency = config.get("currency").toString();
            if (config.containsKey("referenceId")) {
                referenceId = variableResolver.resolve(config.get("referenceId").toString(), session.getVariables());
            }
        }
        
        log.info("Executing PAYMENT node for user: {}. Amount: {} {}", session.getUserId(), currency, amount);
        
        whatsappService.sendPaymentRequest(session.getUserId(), amount, currency, referenceId);
        
        // Payments ALWAYS pause the flow until a webhook confirms the payment status.
        return NodeResult.waitInput();
    }
}
