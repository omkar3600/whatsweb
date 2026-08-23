package com.whatshub.chatbot.controller;

import com.whatshub.chatbot.service.FlowEngine;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks/whatsapp")
@RequiredArgsConstructor
public class WhatsAppWebhookController {
    private final FlowEngine flowEngine;

    @PostMapping
    public void handleIncoming(@RequestBody WhatsAppMessageRequest request) {
        // Extract userId (phone) and message text/click
        String userId = request.getFrom();
        String input = request.getText();
        
        flowEngine.proceed(userId, input);
    }
}

@Data
class WhatsAppMessageRequest {
    private String from;
    private String text;
}
